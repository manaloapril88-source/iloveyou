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

// --- ENDPOINT PARA SA WEBSITE TEST ---
app.post("/ask-text", async (req, res) => {
    try {
        const { message } = req.body;
        const chat = await groq.chat.completions.create({
            messages: [{ role: "user", content: message }],
            model: "llama-3.3-70b-versatile",
        });
        const aiReply = chat.choices[0].message.content;

        // Generate TTS for Website test
        const speechResponse = await groq.audio.speech.create({
            model: "canopylabs/orpheus-v1-english",
            input: aiReply,
            voice: "en-US-natalie",
        });
        const buffer = Buffer.from(await speechResponse.arrayBuffer());
        const filename = `web_res_${Date.now()}.mp3`;
        fs.writeFileSync(path.join(__dirname, 'public', filename), buffer);

        res.json({ reply: aiReply, audioUrl: `/${filename}` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- WEBSOCKET PARA SA ESP32 ---
wss.on("connection", (ws) => {
    console.log("Device Linked (ESP32 or Dashboard)");
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
                    fs.writeFileSync('input.wav', wav.toBuffer());

                    const transcription = await groq.audio.transcriptions.create({
                        file: fs.createReadStream('input.wav'),
                        model: "whisper-large-v3-turbo",
                    });

                    // Broadcast transcription to dashboard
                    ws.send(JSON.stringify({ type: 'user', content: transcription.text }));

                    const chat = await groq.chat.completions.create({
                        messages: [{ role: "user", content: transcription.text }],
                        model: "llama-3.3-70b-versatile",
                    });
                    const aiReply = chat.choices[0].message.content;

                    const speech = await groq.audio.speech.create({
                        model: "canopylabs/orpheus-v1-english",
                        input: aiReply,
                    });
                    const audioBuf = Buffer.from(await speech.arrayBuffer());
                    const audioFile = `res_${Date.now()}.mp3`;
                    fs.writeFileSync(path.join(__dirname, 'public', audioFile), audioBuf);

                    // Send audio URL to ESP32
                    const url = `http://${process.env.SERVER_IP || 'localhost'}:3000/${audioFile}`;
                    ws.send(url); 
                }
                audioChunks = [];
            }, 1200);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
