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
                { 
                    role: "system", 
                    content: `You are Alexatron by April Manalo. 
                              Respond in Taglish (Tagalog-English mix). 
                              Be helpful and concise (max 2 sentences).` 
                },
                { role: "user", content: req.body.message }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.6,
        });

        const reply = chatCompletion.choices[0]?.message?.content || "Pasensya na, nag-error ako.";
        res.json({ response: reply });
    } catch (error) {
        res.status(500).json({ response: "System error po." });
    }
});

app.listen(3000, () => console.log(`🚀 Server on http://localhost:3000`));
