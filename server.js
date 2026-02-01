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

// ──────────────────────────────────────────────
// DUAL-MODE ENDPOINT
// ──────────────────────────────────────────────
app.post("/alexatron-voice", upload.single("audio"), async (req, res) => {
  console.log("───────────────────────────────");
  console.log("Incoming request at:", new Date().toISOString());
  console.log("From User-Agent:", req.headers['user-agent'] || "unknown");
  console.log("Accept header:", req.headers['accept'] || "none");

  if (!req.file) {
    console.log("→ No file received");
    return res.status(400).json({ error: "No audio uploaded" });
  }

  console.log("→ File received:", req.file.originalname, req.file.size, "bytes");

  try {
    // 1. STT - Groq Whisper
    console.log("→ Starting STT...");
    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(req.file.path),
      model: "whisper-large-v3-turbo",
      language: "en",
      response_format: "text",
      temperature: 0.0
    });

    const userText = transcription.text.trim();
    console.log("[STT] → User said:", userText || "(empty transcription)");

    if (!userText) {
      console.log("→ Empty transcription - returning error");
      return res.status(400).json({ error: "No speech detected in audio" });
    }

    // 2. LLM - Alexatron reply
    console.log("→ Generating reply...");
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

    const reply = completion.choices[0]?.message?.content?.trim() || "Sorry, I didn't catch that.";
    console.log("[LLM] → Reply:", reply);

    // 3. TTS - Google Text-to-Speech
    console.log("→ Generating TTS MP3...");
    const ttsRequest = {
      input: { text: reply },
      voice: { languageCode: "en-US", name: "en-US-Neural2-F" },
      audioConfig: { audioEncoding: "MP3", speakingRate: 1.08, pitch: -1.5 }
    };

    const [ttsResponse] = await textToSpeech.synthesizeSpeech(ttsRequest);
    console.log("[TTS] → MP3 generated successfully, size:", ttsResponse.audioContent.length, "bytes");

    // Detect if request is from ESP32
    const userAgent = req.headers['user-agent'] || "";
    const isLikelyESP32 = userAgent.includes("ESP32") || userAgent.includes("HTTPClient") || userAgent.includes("Arduino");

    if (isLikelyESP32) {
      console.log("→ ESP32 detected → sending RAW MP3");
      res.set({
        "Content-Type": "audio/mpeg",
        "Content-Length": ttsResponse.audioContent.length,
        "Cache-Control": "no-cache"
      });
      res.send(ttsResponse.audioContent);
    } else {
      console.log("→ Browser/Postman detected → sending JSON + base64");
      const audioBase64 = ttsResponse.audioContent.toString('base64');
      res.json({
        success: true,
        stt: userText,
        reply: reply,
        audioBase64: audioBase64,
        audioLengthBytes: ttsResponse.audioContent.length
      });
    }
  } catch (err) {
    console.error("→ PROCESSING ERROR:", err.message);
    console.error("Full error stack:", err.stack || err);
    res.status(500).json({ error: "Server error", details: err.message });
  } finally {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
      console.log("→ Temp audio file deleted");
    }
    console.log("Request completed ───────────────────────────────");
  }
});

// Root route for UI
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Alexatron server running on port ${PORT}`);
});
