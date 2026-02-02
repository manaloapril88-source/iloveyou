require("dotenv").config();
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const Groq = require("groq-sdk");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const { WaveFile } = require('wavefile');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

if (!fs.existsSync(path.join(__dirname, 'public'))) fs.mkdirSync(path.join(__dirname, 'public'));

// --- WEB TESTER ENDPOINT ---
app.post("/ask-text", async (req, res) => {
    try {
        const { message } = req.body;
        console.log(`User: ${message}`);

        // 1. LLM Response
        const chat = await groq.chat.completions.create({
            messages: [{ role: "system", content: "You are Alexatron AI. Keep responses brief." },
                       { role: "user", content: message }],
            model: "llama-3.3-70b-versatile",
        });
        const aiReply = chat.choices[0].message.content;

        // 2. Groq TTS (FIXED VOICE & MODEL)
        const speech = await groq.audio.speech.create({
            model: "aura-asteria-en", // Gamitin ang stable model ni Groq
            voice: "diana", // Pili dito: [autumn, diana, hannah, austin, daniel, troy]
            input: aiReply,
            response_format: "mp3"
        });

        const buffer = Buffer.from(await speech.arrayBuffer());
        const filename = `res_${Date.now()}.mp3`;
        fs.writeFileSync(path.join(__dirname, 'public', filename), buffer);

        res.json({ reply: aiReply, audioUrl: `/${filename}` });
    } catch (err) {
        console.error("Web Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// --- ESP32 WEBSOCKET ---
wss.on("connection", (ws) => {
    console.log("ESP32 Linked!");
    let audioChunks = [];

    ws.on("message", async (data) => {
        if (Buffer.isBuffer(data)) {
            audioChunks.push(data);
            clearTimeout(ws.timer);
            ws.timer = setTimeout(async () => {
                if (audioChunks.length > 10) {
                    const buffer = Buffer.concat(audioChunks);
                    const wav = new WaveFile();
                    wav.fromScratch(1, 16000, '16', buffer);
                    fs.writeFileSync('input.wav', wav.toBuffer());

                    try {
                        // 3. Groq STT (Whisper-large-v3-turbo)
                        const transcription = await groq.audio.transcriptions.create({
                            file: fs.createReadStream('input.wav'),
                            model: "whisper-large-v3-turbo",
                        });

                        // AI Chat
                        const chat = await groq.chat.completions.create({
                            messages: [{ role: "user", content: transcription.text }],
                            model: "llama-3.3-70b-versatile",
                        });
                        const aiReply = chat.choices[0].message.content;

                        // TTS Response for ESP32
                        const speech = await groq.audio.speech.create({
                            model: "aura-asteria-en",
                            voice: "diana",
                            input: aiReply,
                        });
                        const audioBuf = Buffer.from(await speech.arrayBuffer());
                        const audioFile = `esp_${Date.now()}.mp3`;
                        fs.writeFileSync(path.join(__dirname, 'public', audioFile), audioBuf);

                        // Send URL back to ESP32
                        const url = `http://${req.headers.host}/${audioFile}`;
                        ws.send(url);
                    } catch (e) { console.log("STT Error:", e.message); }
                }
                audioChunks = [];
            }, 1000);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Alexatron Online on port ${PORT}`));
