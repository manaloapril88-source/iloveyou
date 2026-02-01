require("dotenv").config();
const express = require("express");
const Groq = require("groq-sdk");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const textToSpeech = new (require('@google-cloud/text-to-speech').TextToSpeechClient)();

const app = express();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const upload = multer({ dest: "/tmp/" });

app.post("/alexatron-voice", upload.single("audio"), async (req, res) => {
  console.log("Received audio request");

  if (!req.file) {
    console.log("No file uploaded");
    return res.status(400).json({ error: "No audio uploaded" });
  }

  console.log("File received:", req.file.originalname, req.file.size, "bytes");

  try {
    // 1. STT
    console.log("Starting Groq Whisper STT...");
    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(req.file.path),
      model: "whisper-large-v3-turbo",
      language: "en",
      response_format: "text",
      temperature: 0.0
    });

    const userText = transcription.text.trim();
    console.log("[STT SUCCESS] User said:", userText || "(empty transcription)");

    if (!userText) {
      console.log("Empty transcription - throwing error");
      return res.status(400).json({ error: "No speech detected in audio" });
    }

    // 2. LLM
    console.log("Generating Alexatron reply...");
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are Alexatron, a smart assistant created by April Manalo. The user may call you computer or ai as wakeword.
Respond in English ONLY. Be professional, witty, and concise (maximum 2 sentences).`
        },
        { role: "user", content: userText }
      ],
      model: "llama-3.1-70b-versatile",
      temperature: 0.65,
      max_tokens: 140
    });

    const reply = completion.choices[0]?.message?.content?.trim() || "Sorry, I didn't understand.";
    console.log("[LLM SUCCESS] Reply:", reply);

    // 3. TTS
    console.log("Generating TTS MP3...");
    const ttsRequest = {
      input: { text: reply },
      voice: { languageCode: "en-US", name: "en-US-Neural2-F" },
      audioConfig: { audioEncoding: "MP3", speakingRate: 1.08, pitch: -1.5 }
    };

    const [ttsResponse] = await textToSpeech.synthesizeSpeech(ttsRequest);
    console.log("[TTS SUCCESS] MP3 generated, length:", ttsResponse.audioContent.length, "bytes");

    // Return JSON for easy debugging + playback
    const audioBase64 = ttsResponse.audioContent.toString('base64');

    res.json({
      success: true,
      stt: userText,
      reply: reply,
      audioBase64: audioBase64,
      audioLength: ttsResponse.audioContent.length
    });
  } catch (err) {
    console.error("Processing error:", err.message);
    console.error("Full error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  } finally {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
      console.log("Temp file deleted");
    }
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Alexatron running → http://localhost:${PORT}`);
});
