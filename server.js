const express = require('express');
const path = require('path');
const Groq = require('groq-sdk');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

const groq = new Groq({ apiKey: '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' });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/chat', async (req, res) => {
    const { messages } = req.body;

    try {
        const completion = await groq.chat.completions.create({
            messages,
            model: "llama-3.1-70b-versatile",
            temperature: 0.9,
            max_tokens: 2048,
            stream: false
        });

        res.json({ content: completion.choices[0].message.content });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error sa Groq' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
