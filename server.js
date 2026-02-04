const WebSocket = require('ws');
const http = require('http');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const GROQ_API_KEY = process.env.GROQ_API_KEY || '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';

if (!GROQ_API_KEY) {
  console.error('GROQ_API_KEY missing!');
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
    // Keep-alive from ESP32
    if (typeof message === 'string' && message === 'ping') {
      ws.send('pong');
      return;
    }

    // Audio binary from ESP32 (raw 16-bit PCM mono 16kHz)
    if (Buffer.isBuffer(message)) {
      console.log(`Received audio binary (${message.length} bytes)`);

      try {
        // Save raw PCM
        fs.writeFileSync(tempRawIn, message);

        // Add WAV header (Whisper needs proper format)
        const wav = new WaveFile();
        wav.fromScratch(1, 16000, '16', message); // mono, 16kHz, 16-bit
        wav.toBitDepth('16');
        fs.writeFileSync(tempWavIn, wav.toBuffer());

        // STT
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

        if (!userText) throw new Error('No speech detected');

        // LLM (streaming)
        let aiText = '';
        const llmRes = await axios.post(
          'https://api.groq.com/openai/v1/chat/completions',
          {
            messages: [{ role: 'user', content: userText }],
            model: 'openai/gpt-oss-120b',  // o 'llama-3.1-70b-versatile' kung gusto mo mas mabilis
            temperature: 1,
            max_tokens: 8192,
            stream: true,
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

        await new Promise((r) => llmRes.data.on('end', r));
        aiText = aiText.trim();
        console.log('AI reply:', aiText);

        // TTS
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

        // Send back to ESP32
        ws.send(JSON.stringify({ type: 'text', content: aiText }));
        ws.send(fs.readFileSync(tempOut));

        console.log('Response sent');
      } catch (err) {
        console.error('Processing error:', err.message);
        ws.send(JSON.stringify({ type: 'error', message: err.message || 'Server error' }));
      } finally {
        // Cleanup
        [tempRawIn, tempWavIn, tempOut].forEach((f) => {
          if (fs.existsSync(f)) fs.unlinkSync(f);
        });
      }
    }
  });

  ws.on('close', () => console.log('ESP32 disconnected'));
});

// Keep-alive ping every 30s
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

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received - shutting down');
  server.close(() => process.exit(0));
});
