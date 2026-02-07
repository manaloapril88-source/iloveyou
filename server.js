// server.js (modern ESM version)
import express from 'express';
import path from 'path';
import { Groq } from 'groq-sdk';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

const groq = new Groq({
  apiKey: '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'
});

app.use(cors());
app.use(express.json());

// Serve static files from 'public' folder (index.html, styles.css, script.js)
app.use(express.static(path.join(process.cwd(), 'public')));

app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Walang messages' });
  }

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: messages,
      model: "openai/gpt-oss-120b",  // o palitan kung iba ang model mo
      temperature: 1,
      max_completion_tokens: 8192,
      top_p: 1,
      stream: false,
      stop: null
    });

    const content = chatCompletion.choices[0]?.message?.content || '';
    res.json({ content });
  } catch (error) {
    console.error('Groq Error:', error);
    res.status(500).json({ 
      error: 'May problema sa Groq. Subukan ulit mamaya.',
      details: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Convo AI server tumatakbo sa http://localhost:${PORT}`);
});
