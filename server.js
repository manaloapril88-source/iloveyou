import express from "express";
import path from "path";
import axios from "axios";
import fs from "fs";
import FormData from "form-data";

const app = express();
const PORT = 3000;

const GROQ_API_KEY = "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";

app.use(express.json({ limit: "50mb" }));
app.use(express.static(path.join(process.cwd(), ""))); // serve root files

// --- STT endpoint ---
app.post("/stt", async (req, res) => {
  try {
    const { audioBase64 } = req.body;
    const response = await axios.post(
      "https://api.groq.com/v1/audio/transcriptions",
      {
        file: audioBase64,
        model: "whisper-large-v3-turbo",
        temperature: 0,
        response_format: "verbose_json"
      },
      { headers: { Authorization: "Bearer " + GROQ_API_KEY } }
    );
    res.json(response.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "STT failed" });
  }
});

// --- AI endpoint ---
app.post("/ai", async (req, res) => {
  try {
    const { transcript } = req.body;
    const response = await axios.post(
      "https://api.groq.com/v1/chat/completions",
      {
        model: "groq/compound-mini",
        messages: [{ role: "user", content: transcript }],
        temperature: 1,
        max_completion_tokens: 512
      },
      { headers: { Authorization: "Bearer " + GROQ_API_KEY } }
    );
    res.json(response.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "AI failed" });
  }
});

// --- TTS endpoint ---
app.post("/tts", async (req, res) => {
  try {
    const { text } = req.body;
    const response = await axios.post(
      "https://api.groq.com/v1/audio/speech",
      {
        input: text,
        voice: "autumn",
        model: "canopylabs/orpheus-v1-english",
        response_format: "wav"
      },
      {
        headers: { Authorization: "Bearer " + GROQ_API_KEY },
        responseType: "arraybuffer"
      }
    );
    res.set("Content-Type", "audio/wav");
    res.send(response.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "TTS failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
