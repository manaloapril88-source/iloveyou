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
    const userMessage = req.body.message;

    try {
        console.log("User Input:", userMessage);

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { 
                    role: "system", 
                    content: `You are Alexatron, a smart and helpful AI assistant created by April Manalo. 
                              Rules:
                              1. Understand Tagalog and English.
                              2. ALWAYS respond in English only. 
                              3. Keep answers very concise (1-2 sentences).
                              4. Be professional yet friendly.` 
                },
                { role: "user", content: userMessage }
            ],
            model: "llama-3.3-70b-versatile", 
            temperature: 0.6,
        });

        const reply = chatCompletion.choices[0]?.message?.content || "I am sorry, I couldn't process that.";
        console.log("Alexatron Output:", reply);
        res.json({ reply: reply });

    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ error: "Brain offline." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Alexatron Running: http://localhost:${PORT}`);
});
