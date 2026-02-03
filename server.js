const WebSocket = require('ws');
const http = require('http');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const WaveFile = require('wavefile').WaveFile;

const GROQ_API_KEY = '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'; // hard-coded as requested

if (!GROQ_API_KEY) {
  console.error('GROQ_API_KEY is missing!');
  process.exit(1);
}

const tempRawIn  = path.join(__dirname, 'temp_raw.pcm');
const tempWavIn  = path.join(__dirname, 'temp_in.wav');
const tempOut    = path.join(__dirname, 'temp_out.wav');

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
    return;
  }
  res.writeHead(404);
  res.end('Not found');
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws, req) => {
  console.log(`ESP32 connected from ${req.socket.remoteAddress}`);

  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', async (message) => {
    // Handle keep-alive ping from ESP32
    if (typeof message === 'string' && message === 'ping') {
      ws.send('pong');
      return;
    }

    // Main audio processing (binary from ESP32 = raw 16-bit PCM mono 16kHz)
    if (Buffer.isBuffer(message)) {
      console.log(`Received audio binary (${message.length} bytes)`);

      try {
        // 1. Save raw PCM temporarily
        fs.writeFileSync(tempRawIn, message);

        // 2. Convert raw PCM → proper WAV (Whisper needs header/format)
        const wav = new WaveFile();
        wav.fromScratch(1, 16000, '16', message); // 1 channel, 16kHz, 16-bit signed
        wav.toBitDepth('16');
        fs.writeFileSync(tempWavIn, wav.toBuffer());

        // 3. STT - Whisper Turbo
        const sttForm = new FormData();
        sttForm.append('model', 'whisper-large-v3-turbo');
        sttForm.append('file', fs.createReadStream(tempWavIn));
        sttForm.append('temperature', '0');
        sttForm.append('response_format', 'verbose_json');

        const sttRes = await axios.post(
          'https://api.groq.com/openai/v1/audio/transcriptions',
          sttForm,
          {
            headers: {
              ...sttForm.getHeaders(),
              Authorization: `Bearer ${GROQ_API_KEY}`,
            },
          }
        );

        const userText = sttRes.data.text?.trim() || '';
        console.log('User said:', userText);

        if (!userText) {
          throw new Error('No speech detected');
        }

        // 4. LLM - using your original strong model
        let aiText = '';
        const llmRes = await axios.post(
          'https://api.groq.com/openai/v1/chat/completions',
          {
            messages: [{ role: 'user', content: userText }],
            model: 'openai/gpt-oss-120b',          // ← your preferred model
            temperature: 1,
            max_tokens: 8192,
            stream: true,
            // reasoning_effort: 'medium',         // optional if you want more thoughtful
          },
          {
            headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
            responseType: 'stream',
          }
        );

        llmRes.data.on('data', (chunk) => {
          const lines = chunk.toString().split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.choices?.[0]?.delta?.content) {
                  aiText += data.choices[0].delta.content;
                }
              } catch {}
            }
          }
        });

        await new Promise((resolve) => llmRes.data.on('end', resolve));
        aiText = aiText.trim();
        console.log('AI reply:', aiText);

        if (!aiText) {
          throw new Error('No response from LLM');
        }

        // 5. TTS - Orpheus
        const ttsRes = await axios.post(
          'https://api.groq.com/openai/v1/audio/speech',
          {
            model: 'canopylabs/orpheus-v1-english',
            voice: 'autumn',
            input: aiText,
            response_format: 'wav',
          },
          {
            headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
            responseType: 'arraybuffer',
          }
        );

        fs.writeFileSync(tempOut, ttsRes.data);

        // 6. Send response to ESP32
        ws.send(JSON.stringify({ type: 'text', content: aiText }));
        ws.send(fs.readFileSync(tempOut));

        console.log('Response sent to ESP32');
      } catch (err) {
        console.error('Processing failed:', err.message);
        ws.send(JSON.stringify({ type: 'error', message: err.message || 'Server error' }));
      } finally {
        // Cleanup temp files
        [tempRawIn, tempWavIn, tempOut].forEach((file) => {
          if (fs.existsSync(file)) fs.unlinkSync(file);
        });
      }
    }
  });

  ws.on('close', () => {
    console.log('ESP32 disconnected');
  });
});

// Keep-alive ping every 30 seconds
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown for Render
process.on('SIGTERM', () => {
  console.log('SIGTERM received - shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
