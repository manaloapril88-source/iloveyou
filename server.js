require("dotenv").config();
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const Groq = require("groq-sdk");
const cors = require("cors");

const app = express();
// Siguraduhin na exist ang 'uploads' folder
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

const upload = multer({ dest: "uploads/" });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.use(cors());
app.use(express.static("public"));
app.use(express.json());

app.post("/talk", upload.single("audio"), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No audio file uploaded." });
    }

    // FIX: I-rename ang multer file para magkaroon ng extension
    // Mahalaga ito para hindi mag-error ang Groq STT
    const tempPath = req.file.path;
    const inputAudioPath = tempPath + ".wav";
    fs.renameSync(tempPath, inputAudioPath);

    const outputAudioPath = path.resolve(`uploads/output_${Date.now()}.wav`);

    try {
        console.log("1. Processing STT...");

        // --- STEP 1: STT (Speech to Text) ---
        const transcription = await groq.audio.transcriptions.create({
            file: fs.createReadStream(inputAudioPath),
            model: "whisper-large-v3-turbo",
            response_format: "verbose_json",
        });

        const userText = transcription.text;
        console.log("User said:", userText);

        if (!userText || userText.trim().length === 0) {
            throw new Error("I couldn't hear anything clearly.");
        }

        // --- STEP 2: LLM (Text Generation) ---
        console.log("2. Generating AI Response...");
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "You are a helpful and witty voice assistant. Keep answers concise.",
                },
                {
                    role: "user",
                    content: userText,
                },
            ],
            // Gamitin ang model na gusto mo, or stable fallback
            model: "llama-3.3-70b-versatile", 
            temperature: 0.7,
            max_completion_tokens: 1024,
        });

        const aiResponseText = chatCompletion.choices[0]?.message?.content || "Sorry, I'm having trouble thinking right now.";
        console.log("AI replied:", aiResponseText);

        // --- STEP 3: TTS (Text to Speech) ---
        console.log("3. Converting Text to Speech...");
        const wav = await groq.audio.speech.create({
            model: "canopylabs/orpheus-v1-english",
            voice: "autumn",
            response_format: "wav",
            input: aiResponseText,
        });

        const buffer = Buffer.from(await wav.arrayBuffer());
        await fs.promises.writeFile(outputAudioPath, buffer);

        console.log("4. Sending Audio back!");

        // Ipadala ang audio file sa frontend
        res.sendFile(outputAudioPath, async (err) => {
            // Linisin ang mga files pagkatapos maipadala
            try {
                if (fs.existsSync(inputAudioPath)) fs.unlinkSync(inputAudioPath);
                if (fs.existsSync(outputAudioPath)) {
                    // Bigyan ng konting delay bago burahin para siguradong tapos na ang stream
                    setTimeout(() => {
                        if (fs.existsSync(outputAudioPath)) fs.unlinkSync(outputAudioPath);
                    }, 5000);
                }
            } catch (e) {
                console.error("Cleanup error:", e);
            }
        });

    } catch (error) {
        console.error("Error processing request:", error);
        
        // Cleanup kung nag-error
        if (fs.existsSync(inputAudioPath)) fs.unlinkSync(inputAudioPath);
        
        res.status(500).json({ 
            error: "Something went wrong.", 
            details: error.message 
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server ready at http://localhost:${PORT}`);
});
