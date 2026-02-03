const WebSocket = require('ws');
const http = require('http');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const GROQ_API_KEY = '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'; // Replace with your key

// Create HTTP server and WebSocket server
const server = http.createServer();
const wss = new WebSocket.Server({ server });

// Temporary file paths (deleted after use)
const tempAudioIn = path.join(__dirname, 'temp_audio_in.m4a');
const tempAudioOut = path.join(__dirname, 'temp_audio_out.wav');

// Handle WebSocket connections
wss.on('connection', (ws) => {
  console.log('ESP32 connected via WebSocket');

  ws.on('message', async (message) => {
    if (typeof message === 'string') {
      console.log('Received text message:', message);
      // Handle any text commands if needed (e.g., 'ping')
      return;
    }

    // Assume binary message is audio from ESP32 (after button release)
    console.log('Received audio binary from ESP32');
    try {
      // Save incoming audio temporarily
      fs.writeFileSync(tempAudioIn, message);

      // Step 1: STT (Speech-to-Text)
      const sttForm = new FormData();
      sttForm.append('model', 'whisper-large-v3-turbo');
      sttForm.append('file', fs.createReadStream(tempAudioIn));
      sttForm.append('temperature', '0');
      sttForm.append('response_format', 'verbose_json');

      const sttResponse = await axios.post('https://api.groq.com/openai/v1/audio/transcriptions', sttForm, {
        headers: {
          ...sttForm.getHeaders(),
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
      });

      const userText = sttResponse.data.text.trim();
      console.log('STT Result:', userText);

      // Step 2: LLM (Pass user text to model)
      const llmPayload = {
        messages: [{ role: 'user', content: userText }],
        model: 'openai/gpt-oss-120b', // As per your curl; note: Verify if this model exists on Groq
        temperature: 1,
        max_completion_tokens: 8192,
        top_p: 1,
        stream: true,
        reasoning_effort: 'medium',
        stop: null,
      };

      const llmResponse = await axios.post('https://api.groq.com/openai/v1/chat/completions', llmPayload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
        responseType: 'stream', // For streaming
      });

      let aiText = '';
      llmResponse.data.on('data', (chunk) => {
        const lines = chunk.toString().split('\n');
        lines.forEach((line) => {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            if (data.choices && data.choices[0].delta.content) {
              aiText += data.choices[0].delta.content;
            }
          }
        });
      });

      await new Promise((resolve) => llmResponse.data.on('end', resolve));
      aiText = aiText.trim();
      console.log('LLM Response:', aiText);

      // Step 3: TTS (Text-to-Speech)
      const ttsPayload = {
        model: 'canopylabs/orpheus-v1-english',
        voice: 'autumn',
        input: aiText,
        response_format: 'wav',
      };

      const ttsResponse = await axios.post('https://api.groq.com/openai/v1/audio/speech', ttsPayload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
        responseType: 'arraybuffer', // Get binary audio
      });

      // Save TTS output temporarily
      fs.writeFileSync(tempAudioOut, ttsResponse.data);

      // Step 4: Send back to ESP32
      // First, send text for OLED display
      ws.send(JSON.stringify({ type: 'text', content: aiText }));
      // Then, send audio binary for playback
      const audioBuffer = fs.readFileSync(tempAudioOut);
      ws.send(audioBuffer);

      // Clean up temp files
      fs.unlinkSync(tempAudioIn);
      fs.unlinkSync(tempAudioOut);
    } catch (error) {
      console.error('Error processing:', error.message);
      ws.send(JSON.stringify({ type: 'error', message: 'Processing failed' }));
    }
  });

  ws.on('close', () => {
    console.log('ESP32 disconnected');
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running on ws://localhost:${PORT}`);
});
