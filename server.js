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

// Gawa ng public folder kung wala pa
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir);

// --- WEB TESTER ENDPOINT ---
app.post("/ask-text", async (req, res) => {
    try {
        const { message } = req.body;
        console.log(`Web User: ${message}`);

        // 1. Get Response from Llama
        const chat = await groq.chat.completions.create({
            messages: [{ role: "user", content: message }],
            model: "llama-3.3-70b-versatile",
        });
        const aiReply = chat.choices[0].message.content;

        // 2. Exact Groq TTS Model & Voice (Autumn)
        const speechResponse = await groq.audio.speech.create({
            model: "canopylabs/orpheus-v1-english",
            voice: "autumn",
            input: aiReply,
            response_format: "wav"
        });

        const buffer = Buffer.from(await speechResponse.arrayBuffer());
        const filename = `web_res_${Date.now()}.wav`;
        fs.writeFileSync(path.join(publicDir, filename), buffer);

        // Ibalik ang response sa Website
        res.json({ reply: aiReply, audioUrl: `/${filename}` });
    } catch (err) {
        console.error("Web Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// --- ESP32 WEBSOCKET LOGIC ---
wss.on("connection", (ws) => {
    console.log("ESP32 Connected via WebSocket");
    let audioChunks = [];

    ws.on("message", async (data) => {
        if (Buffer.isBuffer(data)) {
            audioChunks.push(data);
            clearTimeout(ws.timer);
            ws.timer = setTimeout(async () => {
                if (audioChunks.length > 15) {
                    const buffer = Buffer.concat(audioChunks);
                    const wav = new WaveFile();
                    wav.fromScratch(1, 16000, '16', buffer);
                    const inputPath = path.join(__dirname, 'input.wav');
                    fs.writeFileSync(inputPath, wav.toBuffer());

                    try {
                        // Groq STT
                        const transcription = await groq.audio.transcriptions.create({
                            file: fs.createReadStream(inputPath),
                            model: "whisper-large-v3-turbo",
                        });

                        // AI Chat
                        const chat = await groq.chat.completions.create({
                            messages: [{ role: "user", content: transcription.text }],
                            model: "llama-3.3-70b-versatile",
                        });
                        const aiReply = chat.choices[0].message.content;

                        // Groq TTS (Autumn)
                        const speech = await groq.audio.speech.create({
                            model: "canopylabs/orpheus-v1-english",
                            voice: "autumn",
                            input: aiReply,
                            response_format: "wav"
                        });
                        
                        const audioBuf = Buffer.from(await speech.arrayBuffer());
                        const audioFile = `esp_res_${Date.now()}.wav`;
                        fs.writeFileSync(path.join(publicDir, audioFile), audioBuf);

                        // Send URL back to ESP32
                        ws.send(`http://${req.headers.host}/${audioFile}`);
                    } catch (e) { console.error("Process Error:", e.message); }
                }
                audioChunks = [];
            }, 1000);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Alexatron Server Running on Port ${PORT}`));
