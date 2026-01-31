require("dotenv").config();
const express = require("express");
const Groq = require("groq-sdk");
const cors = require("cors");

const app = express();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.use(cors());
app.use(express.static("public"));
app.use(express.json());

app.post("/ask-alexatron", async (req, res) => {
    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: "You are Alexatron, a smart AI created by April Manalo. Respond in 1-2 English sentences only." },
                { role: "user", content: req.body.message }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.6,
        });
        res.json({ reply: chatCompletion.choices[0]?.message?.content || "Error." });
    } catch (error) {
        res.status(500).json({ error: "Offline." });
    }
});

app.listen(3000, () => console.log("🚀 Alexatron live on port 3000"));
