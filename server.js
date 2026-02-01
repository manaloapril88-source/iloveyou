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
app.use(express.static(path.join(__dirname, "public"))); // Serve UI

const upload = multer({ dest: "/tmp/" });

// ESP32 audio endpoint → returns MP3 directly
app.post("/alexatron-voice", upload.single("audio"), async (req, res) => {
  if (!req.file) {
    return res.status(400).send("No audio uploaded");
  }

  try {
    // 1. Groq Whisper STT
    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(req.file.path),
      model: "whisper-large-v3-turbo",
      language: "en",
      response_format: "text",
      temperature: 0.0
    });

    const userText = transcription.text.trim();
    console.log("[STT] User:", userText);

    if (!userText) throw new Error("Empty transcription");

    // 2. Alexatron LLM
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

    let reply = completion.choices[0]?.message?.content?.trim() || "Sorry, I didn't understand.";

    // 3. Google TTS → MP3
    const ttsRequest = {
      input: { text: reply },
      voice: { languageCode: "en-US", name: "en-US-Neural2-F" }, // change name if you want other voice
      audioConfig: { audioEncoding: "MP3", speakingRate: 1.08, pitch: -1.5 }
    };

    const [ttsResponse] = await textToSpeech.synthesizeSpeech(ttsRequest);

    res.set({
      "Content-Type": "audio/mpeg",
      "Content-Length": ttsResponse.audioContent.length,
      "Cache-Control": "no-cache"
    });

    res.send(ttsResponse.audioContent);
  } catch (err) {
    console.error("Processing error:", err.message);
    res.status(500).send("Server error");
  } finally {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
  }
});

// Root → serve web UI
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Alexatron running → http://localhost:${PORT}`);
});
