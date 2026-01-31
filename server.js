require("dotenv").config();
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const Groq = require("groq-sdk");
const cors = require("cors");

const app = express();
const upload = multer({ dest: "uploads/" });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.use(cors());
app.use(express.static("public"));
app.use(express.json());

// Main Route
app.post("/talk", upload.single("audio"), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No audio uploaded" });

    const tempPath = req.file.path;
    const inputAudioPath = tempPath + ".wav";
    fs.renameSync(tempPath, inputAudioPath);
    const outputAudioPath = path.resolve(`uploads/output_${Date.now()}.wav`);

    try {
        console.log("1. Processing STT...");
        const transcription = await groq.audio.transcriptions.create({
            file: fs.createReadStream(inputAudioPath),
            model: "whisper-large-v3-turbo",
            response_format: "verbose_json",
        });

        const userText = transcription.text;
        console.log("User said:", userText);

        console.log("2. Generating AI Response...");
        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: "user", content: userText }],
            model: "llama-3.3-70b-versatile",
        });

        const aiResponseText = chatCompletion.choices[0]?.message?.content || "No response.";
        console.log("AI replied:", aiResponseText);

        // --- STEP 3: TTS (Fixed using Native Fetch) ---
        console.log("3. Converting Text to Speech...");

        const ttsResponse = await fetch("https://api.groq.com/openai/v1/audio/speech", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "canopylabs/orpheus-v1-english",
                voice: "autumn",
                input: aiResponseText,
                response_format: "wav"
            })
        });

        if (!ttsResponse.ok) {
            const errBody = await ttsResponse.text();
            throw new Error(`Groq TTS API Error: ${errBody}`);
        }

        const arrayBuffer = await ttsResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        await fs.promises.writeFile(outputAudioPath, buffer);

        console.log("4. Audio generated! Sending to client...");
        res.sendFile(outputAudioPath, () => {
            // Cleanup files
            if (fs.existsSync(inputAudioPath)) fs.unlinkSync(inputAudioPath);
            setTimeout(() => {
                if (fs.existsSync(outputAudioPath)) fs.unlinkSync(outputAudioPath);
            }, 10000);
        });

    } catch (error) {
        console.error("Error processing request:", error);
        if (fs.existsSync(inputAudioPath)) fs.unlinkSync(inputAudioPath);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server at http://localhost:${PORT}`));
