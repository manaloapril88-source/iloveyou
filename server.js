const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const WaveFile = require('wavefile').WaveFile;

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const GROQ_API_KEY = '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'; // hard-coded as requested

// Serve static files: firmware .bin and public HTML/JS
app.use('/firmware', express.static(path.join(__dirname, 'firmware')));
app.use(express.static(path.join(__dirname, 'public')));

// Flash page (your "web.esphome.io"-like installer)
app.get('/flash', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'flash.html'));
});

// Health check (existing)
app.get('/health', (req, res) => {
  res.send('OK');
});

// ── Your existing WebSocket + Voice AI logic ───────────────────────────────────────
const tempRawIn  = path.join(__dirname, 'temp_raw.pcm');
const tempWavIn  = path.join(__dirname, 'temp_in.wav');
const tempOut    = path.join(__dirname, 'temp_out.wav');

wss.on('connection', (ws, req) => {
  console.log(`ESP32 connected from ${req.socket.remoteAddress}`);

  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', async (message) => {
    if (typeof message === 'string' && message === 'ping') {
      ws.send('pong');
      return;
    }

    if (Buffer.isBuffer(message)) {
      console.log(`Received audio (${message.length} bytes)`);
      try {
        fs.writeFileSync(tempRawIn, message);

        const wav = new WaveFile();
        wav.fromScratch(1, 16000, '16', message);
        wav.toBitDepth('16');
        fs.writeFileSync(tempWavIn, wav.toBuffer());

        const sttForm = new FormData();
        sttForm.append('model', 'whisper-large-v3-turbo');
        sttForm.append('file', fs.createReadStream(tempWavIn));
        sttForm.append('temperature', '0');
        sttForm.append('response_format', 'verbose_json');

        const sttRes = await axios.post(
          'https://api.groq.com/openai/v1/audio/transcriptions',
          sttForm,
          { headers: { ...sttForm.getHeaders(), Authorization: `Bearer ${GROQ_API_KEY}` } }
        );

        const userText = sttRes.data.text?.trim() || '';
        if (!userText) throw new Error('No speech');

        let aiText = '';
        const llmRes = await axios.post(
          'https://api.groq.com/openai/v1/chat/completions',
          {
            messages: [{ role: 'user', content: userText }],
            model: 'openai/gpt-oss-120b',
            temperature: 1,
            max_tokens: 8192,
            stream: true
          },
          { headers: { Authorization: `Bearer ${GROQ_API_KEY}` }, responseType: 'stream' }
        );

        llmRes.data.on('data', (chunk) => {
          const lines = chunk.toString().split('\n');
          lines.forEach(line => {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.choices?.[0]?.delta?.content) aiText += data.choices[0].delta.content;
              } catch {}
            }
          });
        });

        await new Promise(r => llmRes.data.on('end', r));
        aiText = aiText.trim();

        const ttsRes = await axios.post(
          'https://api.groq.com/openai/v1/audio/speech',
          {
            model: 'canopylabs/orpheus-v1-english',
            voice: 'autumn',
            input: aiText,
            response_format: 'wav'
          },
          { headers: { Authorization: `Bearer ${GROQ_API_KEY}` }, responseType: 'arraybuffer' }
        );

        fs.writeFileSync(tempOut, ttsRes.data);

        ws.send(JSON.stringify({ type: 'text', content: aiText }));
        ws.send(fs.readFileSync(tempOut));
      } catch (err) {
        console.error('Error:', err.message);
        ws.send(JSON.stringify({ type: 'error', message: err.message }));
      } finally {
        [tempRawIn, tempWavIn, tempOut].forEach(f => fs.existsSync(f) && fs.unlinkSync(f));
      }
    }
  });

  ws.on('close', () => console.log('Disconnected'));
});

setInterval(() => {
  wss.clients.forEach(ws => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server on port ${PORT} | Flash page: http://localhost:${PORT}/flash`);
});
