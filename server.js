import express from "express";
import path from "path";
import fs from "fs";
import { Groq } from "groq-sdk";
import multer from "multer";

const app = express();
const PORT = 3000;
const groq = new Groq({ apiKey: "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" });

app.use(express.json({ limit: "50mb" }));
app.use(express.static(path.join(process.cwd(), "")));

// For file upload
const upload = multer({ dest: "uploads/" });

// --- STT endpoint ---
app.post("/stt", upload.single("audio"), async (req, res) => {
  try {
    const filePath = req.file.path;

    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: "whisper-large-v3-turbo",
      temperature: 0,
      response_format: "verbose_json"
    });

    fs.unlinkSync(filePath); // cleanup uploaded file

    res.json({ text: transcription.text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "STT failed" });
  }
});

// --- AI endpoint ---
app.post("/ai", async (req, res) => {
  try {
    const { transcript } = req.body;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "user", content: transcript }
      ],
      model: "openai/gpt-oss-120b",
      temperature: 1,
      max_completion_tokens: 8192,
      top_p: 1,
      stream: false,
      reasoning_effort: "medium",
    });

    const aiText = chatCompletion.choices[0].message.content;

    res.json({ text: aiText });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "AI failed" });
  }
});

// --- TTS endpoint ---
app.post("/tts", async (req, res) => {
  try {
    const { text } = req.body;
    const wav = await groq.audio.speech.create({
      model: "canopylabs/orpheus-v1-english",
      voice: "autumn",
      response_format: "wav",
      input: text
    });

    const buffer = Buffer.from(await wav.arrayBuffer());
    res.set("Content-Type", "audio/wav");
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "TTS failed" });
  }
});

// --- Start server ---
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
