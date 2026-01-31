import express from "express";
import axios from "axios";
import fs from "fs";
import FormData from "form-data";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

const GROQ_API_KEY = process.env.GROQ_API_KEY;

/* ================= STT ================= */
app.post("/stt", async (req, res) => {
  try {
    const audio = Buffer.from(req.body.audio, "base64");
    fs.writeFileSync("input.wav", audio);

    const form = new FormData();
    form.append("file", fs.createReadStream("input.wav"));
    form.append("model", "whisper-large-v3-turbo");

    const r = await axios.post(
      "https://api.groq.com/openai/v1/audio/transcriptions",
      form,
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          ...form.getHeaders()
        }
      }
    );

    res.json({ text: r.data.text });
  } catch (e) {
    res.status(500).json(e.response?.data || e.message);
  }
});

/* ================= AI ================= */
app.post("/ai", async (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: "EMPTY TEXT FROM STT" });
  }

  const r = await axios.post(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      model: "openai/gpt-oss-120b",
      messages: [{ role: "user", content: text }]
    },
    {
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      }
    }
  );

  res.json({ text: r.data.choices[0].message.content });
});

/* ================= TTS ================= */
app.post("/tts", async (req, res) => {
  const r = await axios.post(
    "https://api.groq.com/openai/v1/audio/speech",
    {
      model: "canopylabs/orpheus-v1-english",
      voice: "autumn",
      input: req.body.text,
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

  res.set("Content-Type", "audio/wav");
  res.send(r.data);
});

app.listen(process.env.PORT || 3000);
