const WebSocket = require('ws');
const http = require('http');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const GROQ_API_KEY = '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'; // Replace with your key
if (!GROQ_API_KEY) {
  console.error('GROQ_API_KEY not set in environment!');
  process.exit(1);
}

const tempAudioIn = path.join(__dirname, 'temp_in.m4a');
const tempAudioOut = path.join(__dirname, 'temp_out.wav');

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
  console.log(`New connection from ${req.socket.remoteAddress}`);

  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', async (message) => {
    if (typeof message === 'string' && message === 'ping') {
      ws.send('pong');
      return;
    }

    if (Buffer.isBuffer(message)) {
      console.log(`Received audio binary (${message.length} bytes)`);
      try {
        fs.writeFileSync(tempAudioIn, message);

        // STT
        const sttForm = new FormData();
        sttForm.append('model', 'whisper-large-v3-turbo');
        sttForm.append('file', fs.createReadStream(tempAudioIn));
        sttForm.append('temperature', '0');
        sttForm.append('response_format', 'verbose_json');

        const sttRes = await axios.post('https://api.groq.com/openai/v1/audio/transcriptions', sttForm, {
          headers: { ...sttForm.getHeaders(), Authorization: `Bearer ${GROQ_API_KEY}` },
        });
        const userText = sttRes.data.text?.trim() || '';
        console.log('User said:', userText);

        if (!userText) throw new Error('No text from STT');

        // LLM
        let aiText = '';
        const llmRes = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
          messages: [{ role: 'user', content: userText }],
          model: 'llama-3.1-70b-versatile', // Note: your original 'openai/gpt-oss-120b' may not exist; use a real Groq model like this or mixtral
          temperature: 1,
          max_tokens: 8192,
          stream: true,
        }, {
          headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` },
          responseType: 'stream',
        });

        llmRes.data.on('data', (chunk) => {
          const lines = chunk.toString().split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.choices?.[0]?.delta?.content) aiText += data.choices[0].delta.content;
              } catch {}
            }
          }
        });

        await new Promise(r => llmRes.data.on('end', r));
        aiText = aiText.trim();
        console.log('AI reply:', aiText);

        // TTS
        const ttsRes = await axios.post('https://api.groq.com/openai/v1/audio/speech', {
          model: 'canopylabs/orpheus-v1-english',
          voice: 'autumn',
          input: aiText,
          response_format: 'wav',
        }, {
          headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` },
          responseType: 'arraybuffer',
        });

        fs.writeFileSync(tempAudioOut, ttsRes.data);

        // Send to ESP32
        ws.send(JSON.stringify({ type: 'text', content: aiText }));
        ws.send(fs.readFileSync(tempAudioOut));

        // Cleanup
        fs.unlinkSync(tempAudioIn);
        fs.unlinkSync(tempAudioOut);
      } catch (err) {
        console.error('Processing error:', err.message);
        ws.send(JSON.stringify({ type: 'error', message: err.message }));
      }
    }
  });

  ws.on('close', () => console.log('Client disconnected'));
});

// Keep-alive ping every 30s
setInterval(() => {
  wss.clients.forEach(ws => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Listening on port ${PORT}`);
});

// Graceful shutdown (Render sends SIGTERM)
process.on('SIGTERM', () => {
  console.log('SIGTERM received - shutting down');
  server.close(() => process.exit(0));
});
