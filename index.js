import express from 'express';
import multer from 'multer';
import { Groq } from 'groq-sdk';
import fs from 'fs';
import path from 'path';
import cors from 'cors';

const app = express();
const upload = multer({ dest: 'uploads/' });
const port = process.env.PORT || 3000;

// Hardcoded API Key (As requested)
const GROQ_API_KEY = "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";
const groq = new Groq({ apiKey: GROQ_API_KEY });

app.use(cors());
app.use(express.json());

// Main Endpoint para sa ESP32
app.post('/process-voice', upload.single('audio'), async (req, res) => {
    const audioPath = req.file.path;

    try {
        // 1. STT: Transcribe the user's voice
        const transcription = await groq.audio.transcriptions.create({
            file: fs.createReadStream(audioPath),
            model: "whisper-large-v3-turbo",
            response_format: "verbose_json",
        });

        const userText = transcription.text;
        console.log("User said:", userText);

        // 2. LLM: Process with Groq (Strict English, 1 sentence only)
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    "role": "system",
                    "content": "You are Stella, a helpful AI assistant. You can understand Tagalog but you MUST ALWAYS respond in English. Your response must be very short, exactly one sentence only."
                },
                { "role": "user", "content": userText }
            ],
            model: "llama-3.1-70b-versatile", // Stable model for logic
            temperature: 0.7,
            max_tokens: 50,
        });

        const aiResponse = chatCompletion.choices[0]?.message?.content || "I didn't catch that.";
        console.log("Stella response:", aiResponse);

        // 3. TTS: Convert AI text to Speech
        const speechFile = path.resolve(`./uploads/res_${req.file.filename}.wav`);
        const wav = await groq.audio.speech.create({
            model: "canopylabs/orpheus-v1-english",
            voice: "autumn",
            response_format: "wav",
            input: aiResponse,
        });

        const buffer = Buffer.from(await wav.arrayBuffer());
        await fs.promises.writeFile(speechFile, buffer);

        // Ipadala ang audio file pabalik sa ESP32
        res.sendFile(speechFile, () => {
            // Delete files after sending para hindi ma-full ang server storage
            if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
            if (fs.existsSync(speechFile)) fs.unlinkSync(speechFile);
        });

    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Processing failed" });
    }
});

app.listen(port, () => {
    console.log(`Stella AI API running on port ${port}`);
});
