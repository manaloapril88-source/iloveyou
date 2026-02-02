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
app.use(express.static("public")); // Para sa index.html at audio files

// Ensure 'public' directory exists
if (!fs.existsSync(path.join(__dirname, 'public'))) {
    fs.mkdirSync(path.join(__dirname, 'public'));
}

// --- HTTP Endpoint para sa Website Test (kapag nag-type o Web Speech) ---
app.post("/ask-text", async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ error: "No message provided." });

        console.log(`Web User (Text): ${message}`);

        // 1. AI Chat (Llama 3.3 70B)
        const chat = await groq.chat.completions.create({
            messages: [{ role: "system", content: "You are Alexatron, a witty and helpful AI assistant." },
                       { role: "user", content: message }],
            model: "llama-3.3-70b-versatile",
        });
        const aiReply = chat.choices[0]?.message?.content || "Pasensya na, hindi ko naintindihan.";
        console.log(`Web AI Reply: ${aiReply}`);

        // 2. TTS (Groq / Orpheus-v1-english)
        const speechResponse = await groq.audio.speech.create({
            model: "canopylabs/orpheus-v1-english",
            input: aiReply,
            voice: "en-US-natalie", 
        });
        
        const audioBuffer = Buffer.from(await speechResponse.arrayBuffer());
        const filename = `web_res_${Date.now()}.mp3`;
        const filePath = path.join(__dirname, 'public', filename);
        fs.writeFileSync(filePath, audioBuffer);

        // Send back AI reply and audio URL to the web client
        res.json({ reply: aiReply, audioUrl: `/${filename}` });

    } catch (err) {
        console.error("Web Test Error:", err);
        res.status(500).json({ error: `Server error: ${err.message}` });
    }
});

// --- WebSocket Server para sa ESP32 at Live Dashboard ---
wss.on("connection", (ws) => {
    console.log("New WebSocket Client Connected (ESP32 or Dashboard)");
    let audioChunks = [];
    let isSpeaking = false; // Flag para sa AI output

    ws.on("message", async (data) => {
        // If it's binary data (audio from ESP32)
        if (Buffer.isBuffer(data)) {
            // Only process if AI is not speaking
            if (isSpeaking) {
                console.log("AI is speaking, ignoring mic input.");
                return; 
            }

            audioChunks.push(data);
            clearTimeout(ws.timer);

            ws.timer = setTimeout(async () => {
                if (audioChunks.length > 20) { // Enough audio collected for processing
                    console.log("Processing ESP32 audio...");
                    const buffer = Buffer.concat(audioChunks);
                    const wav = new WaveFile();
                    wav.fromScratch(1, 16000, '16', buffer);
                    const tempInputFile = 'esp32_input.wav';
                    fs.writeFileSync(tempInputFile, wav.toBuffer());

                    try {
                        // 1. STT (Groq Whisper-large-v3-turbo)
                        const transcription = await groq.audio.transcriptions.create({
                            file: fs.createReadStream(tempInputFile),
                            model: "whisper-large-v3-turbo",
                            language: "en", // Specify language
                        });
                        console.log(`ESP32 User: ${transcription.text}`);
                        // Send user's transcription to dashboard
                        wss.clients.forEach(client => {
                            if (client !== ws && client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify({ role: 'user', content: transcription.text }));
                            }
                        });


                        // 2. AI Chat (Llama 3.3 70B)
                        const completion = await groq.chat.completions.create({
                            messages: [{ role: "system", content: "You are Alexatron, a witty and helpful AI assistant." },
                                       { role: "user", content: transcription.text }],
                            model: "llama-3.3-70b-versatile",
                        });
                        const aiReply = completion.choices[0]?.message?.content || "Pasensya na, hindi ko naintindihan.";
                        console.log(`ESP32 AI: ${aiReply}`);
                        // Send AI reply to dashboard
                        wss.clients.forEach(client => {
                            if (client !== ws && client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify({ role: 'ai', content: aiReply }));
                            }
                        });

                        // 3. TTS (Groq / Orpheus-v1-english)
                        isSpeaking = true; // Set flag
                        const speechResponse = await groq.audio.speech.create({
                            model: "canopylabs/orpheus-v1-english",
                            input: aiReply,
                            voice: "en-US-natalie", 
                        });

                        const audioBuffer = Buffer.from(await speechResponse.arrayBuffer());
                        const audioFilename = `esp32_res_${Date.now()}.mp3`;
                        const audioFilePath = path.join(__dirname, 'public', audioFilename);
                        fs.writeFileSync(audioFilePath, audioBuffer);

                        // Send audio URL to ESP32 for playback
                        const publicUrl = `http://${process.env.SERVER_IP || 'localhost'}:${PORT}/${audioFilename}`;
                        ws.send(publicUrl); // Send directly to the ESP32 that sent the mic input

                        // Wait for a moment to allow ESP32 to start playing
                        setTimeout(() => {
                            isSpeaking = false; // Reset flag after expected speech duration
                        }, (aiReply.split(' ').length / 150) * 1000 + 1000); // Estimate time + 1 sec buffer

                    } catch (err) {
                        console.error("Groq Workflow Error (ESP32):", err);
                        ws.send("ERROR"); // Send simple error to ESP32
                        isSpeaking = false;
                    } finally {
                        audioChunks = []; // Clear buffer regardless of outcome
                    }
                }
            }, 1200); // 1.2 seconds of silence triggers processing
        } 
        // If it's a text message from a dashboard client (not ESP32 audio)
        else if (typeof data === 'string') {
            try {
                const message = JSON.parse(data);
                // Handle messages from dashboard if needed, e.g., 'stop listening'
                console.log("Dashboard Message:", message);
            } catch (e) {
                console.log("Received raw text message (likely audio URL from ESP32):", data);
                // This is likely the audio URL from ESP32, do nothing here.
                // The ESP32 client handles this.
            }
        }
    });

    ws.on('close', () => {
        console.log('WebSocket Client Disconnected.');
        clearTimeout(ws.timer); // Clear any pending audio processing
    });

    ws.on('error', (error) => {
        console.error("WebSocket Error:", error);
    });
});


const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Alexatron Server running at http://${process.env.SERVER_IP || 'localhost'}:${PORT}`));
