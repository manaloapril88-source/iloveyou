require("dotenv").config();
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const Groq = require("groq-sdk");
const fs = require("fs");
const path = require("path");
const { WaveFile } = require('wavefile');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Siguraduhing may 'public' folder para sa audio files
if (!fs.existsSync('./public')) fs.mkdirSync('./public');

wss.on("connection", (ws) => {
    console.log("ESP32 Connected to Alexatron Server");
    let audioChunks = [];

    ws.on("message", async (data) => {
        // Tinatanggap ang audio stream mula sa INMP441
        audioChunks.push(data);

        clearTimeout(ws.timer);
        ws.timer = setTimeout(async () => {
            if (audioChunks.length > 20) {
                console.log("Processing Speech...");
                const buffer = Buffer.concat(audioChunks);
                const wav = new WaveFile();
                wav.fromScratch(1, 16000, '16', buffer);
                const filename = 'input.wav';
                fs.writeFileSync(filename, wav.toBuffer());

                try {
                    // --- 1. STT (Groq Whisper-large-v3-turbo) ---
                    const transcription = await groq.audio.transcriptions.create({
                        file: fs.createReadStream(filename),
                        model: "whisper-large-v3-turbo",
                        language: "en",
                    });
                    console.log("User:", transcription.text);

                    // --- 2. AI Chat (Llama 3.3 70B) ---
                    const completion = await groq.chat.completions.create({
                        messages: [{ role: "system", content: "You are Alexatron, a witty and helpful AI assistant." },
                                   { role: "user", content: transcription.text }],
                        model: "llama-3.3-70b-versatile",
                    });
                    const aiReply = completion.choices[0].message.content;
                    console.log("AI:", aiReply);

                    // --- 3. TTS (Groq / Orpheus-v1-english) ---
                    const speechResponse = await groq.audio.speech.create({
                        model: "canopylabs/orpheus-v1-english",
                        input: aiReply,
                        voice: "en-US-natalie", 
                    });

                    const audioBuffer = Buffer.from(await speechResponse.arrayBuffer());
                    const audioFilename = `res_${Date.now()}.mp3`;
                    fs.writeFileSync(path.join(__dirname, 'public', audioFilename), audioBuffer);

                    // I-send ang URL pabalik sa ESP32
                    const publicUrl = `http://${process.env.SERVER_IP}:3000/${audioFilename}`;
                    ws.send(publicUrl);

                } catch (err) {
                    console.error("Workflow Error:", err);
                }
                audioChunks = []; 
            }
        }, 1200); 
    });
});

app.use(express.static("public"));
const PORT = 3000;
server.listen(PORT, () => console.log(`Alexatron Server running at http://${process.env.SERVER_IP}:${PORT}`));
