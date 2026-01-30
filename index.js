import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.static("public"));

app.get("/", (_, res) => {
  res.sendFile(process.cwd() + "/public/index.html");
});

app.get("/api/tts", async (req, res) => {
  const prompt = (req.query.prompt || "").trim();
  const emotion = req.query.emotion || "neutral";
  const model = req.query.model || "openai-audio";
  const voice = req.query.voice || "alloy";
  const seed = Math.floor(Math.random() * 999999);

  if (!prompt) {
    return res.status(400).json({ error: "Missing prompt" });
  }

  const payload = {
    model,
    modalities: ["text", "audio"],
    audio: { voice, format: "mp3" },
    messages: [
      {
        role: "system",
        content: `Speak the following text with a "${emotion}" emotion.`
      },
      { role: "user", content: prompt }
    ],
    seed
  };

  try {
    const response = await axios.post(
      "https://gen.pollinations.ai/v1/chat/completions",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0"
        },
        timeout: 90000
      }
    );

    const audio =
      response.data?.choices?.[0]?.message?.audio?.data;

    if (!audio) {
      return res.status(502).json({
        error: "Audio not returned",
        raw: response.data
      });
    }

    const buffer = Buffer.from(audio, "base64");
    res.set("Content-Type", "audio/mpeg");
    res.send(buffer);
  } catch (err) {
    res.status(500).json({
      error: "Pollinations error",
      details: err.response?.data || err.message
    });
  }
});

app.listen(PORT, () =>
  console.log(`🚀 Running → http://localhost:${PORT}`)
);

