import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: "50mb" }));

const GROQ_API_KEY = process.env.GROQ_API_KEY || "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";

/* ========== Serve frontend ========== */
app.use(express.static(__dirname));

/* ========== STT endpoint ========== */
app.post("/stt", async (req, res) => {
  try {
    const { audioBase64 } = req.body;
    if (!audioBase64) return res.status(400).json({ error: "No audio provided" });

    const resp = await axios.post(
      "https://api.groq.com/openai/v1/audio/transcriptions/create",
      {
        file: audioBase64,
        model: "whisper-large-v3-turbo",
        response_format: "verbose_json"
      },
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    res.json({ text: resp.data.text });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "STT failed" });
  }
});

/* ========== AI endpoint ========== */
app.post("/ai", async (req, res) => {
  try {
    const { text } = req.body;

    const resp = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "openai/gpt-oss-120b",
        messages: [{ role: "user", content: text }],
        temperature: 1,
        max_tokens: 512
      },
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    res.json({ text: resp.data.choices[0].message.content });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "AI failed" });
  }
});

/* ========== TTS endpoint ========== */
app.post("/tts", async (req, res) => {
  try {
    const { text } = req.body;

    const resp = await axios.post(
      "https://api.groq.com/openai/v1/audio/speech",
      {
        input: text,
        voice: "autumn",
        model: "canopylabs/orpheus-v1-english",
        response_format: "wav"
      },
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        responseType: "arraybuffer"
      }
    );

    res.setHeader("Content-Type", "audio/wav");
    res.send(resp.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "TTS failed" });
  }
});

/* ========== Start server ========== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
