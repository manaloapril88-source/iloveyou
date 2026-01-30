import express from "express";
import axios from "axios";

const app = express();
const PORT = process.env.PORT || 3000;
const GROQ_API_KEY = process.env.GROQ_API_KEY || "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";

app.use(express.json({ limit: "50mb" }));

/* ================= STT ================= */
app.post("/stt", async (req, res) => {
  try {
    const { audioBase64 } = req.body;
    if (!audioBase64) return res.status(400).json({ error: "no audio" });

    const resp = await axios.post(
      "https://api.groq.com/openai/v1/audio/transcriptions",
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
  } catch (e) {
    console.error(e.response?.data || e.message);
    res.status(500).json({ error: "stt failed" });
  }
});

/* ================= AI ================= */
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
  } catch (e) {
    console.error(e.response?.data || e.message);
    res.status(500).json({ error: "ai failed" });
  }
});

/* ================= TTS ================= */
app.post("/tts", async (req, res) => {
  try {
    const { text } = req.body;

    const resp = await axios.post(
      "https://api.groq.com/openai/v1/audio/speech",
      {
        model: "canopylabs/orpheus-v1-english",
        voice: "autumn",
        input: text,
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
  } catch (e) {
    console.error(e.response?.data || e.message);
    res.status(500).json({ error: "tts failed" });
  }
});

app.listen(PORT, () => {
  console.log("Server running on", PORT);
});
