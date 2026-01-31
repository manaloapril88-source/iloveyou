require("dotenv").config();
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const Groq = require("groq-sdk");
const cors = require("cors");

const app = express();

// Siguraduhin na exist ang uploads folder
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const upload = multer({ dest: "uploads/" });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.use(cors());
app.use(express.static("public"));
app.use(express.json());

// Main Route: Audio In -> AI Logic -> Audio Out
app.post("/talk", upload.single("audio"), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "Walang audio na natanggap." });

    const tempPath = req.file.path;
    const inputAudioPath = tempPath + ".wav";
    fs.renameSync(tempPath, inputAudioPath);
    const outputAudioPath = path.resolve(`uploads/output_${Date.now()}.wav`);

    try {
        // --- STEP 1: STT (Ang "Tenga" ni Alexatron) ---
        console.log("1. Nakikinig si Alexatron...");
        const transcription = await groq.audio.transcriptions.create({
            file: fs.createReadStream(inputAudioPath),
            model: "whisper-large-v3-turbo",
            response_format: "verbose_json",
        });

        const userText = transcription.text;
        if (!userText || userText.trim().length === 0) {
            throw new Error("Hindi ko narinig nang maayos ang sinabi mo.");
        }
        console.log("Narinig ni Alexatron:", userText);

        // --- STEP 2: LLM (Ang "Utak" ni Alexatron) ---
        console.log("2. Nag-iisip ng isasagot...");
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { 
                    role: "system", 
                    content: `Ikaw ay si Alexatron, isang matalino at friendly na AI voice assistant. 
                              Ang iyong tagalikha (AI Developer) ay si April Manalo. 
                              Dahil may STT (Speech-to-Text) feature ka, sabihin mo na naririnig mo ang gumagamit.
                              Panatilihing maikli, natural, at direkta ang iyong mga sagot para sa maayos na usapan. 
                              Gumamit ng Tagalog o Taglish kung kinakailangan.` 
                },
                { role: "user", content: userText }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.7,
        });

        const aiResponseText = chatCompletion.choices[0]?.message?.content || "Pasensya na, medyo naguluhan ako.";
        console.log("Sagot ni Alexatron:", aiResponseText);

        // --- STEP 3: TTS (Ang "Boses" ni Alexatron) ---
        console.log("3. Nagsasalita na si Alexatron...");
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
            throw new Error(`TTS Error: ${errBody}`);
        }

        const arrayBuffer = await ttsResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        await fs.promises.writeFile(outputAudioPath, buffer);

        // --- STEP 4: Pagpapadala ng Audio pabalik sa Client ---
        console.log("4. Tapos na! I-play na ang boses.");
        res.sendFile(outputAudioPath, () => {
            // Linisin ang mga temporary files
            if (fs.existsSync(inputAudioPath)) fs.unlinkSync(inputAudioPath);
            setTimeout(() => {
                if (fs.existsSync(outputAudioPath)) fs.unlinkSync(outputAudioPath);
            }, 10000); // Burahin ang output pagkatapos ng 10 seconds
        });

    } catch (error) {
        console.error("Error sa system ni Alexatron:", error);
        if (fs.existsSync(inputAudioPath)) fs.unlinkSync(inputAudioPath);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Si Alexatron ay gising na sa http://localhost:${PORT}`);
    console.log(`🛠️ Developer: April Manalo`);
});
