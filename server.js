require("dotenv").config();
const express = require("express");
const Groq = require("groq-sdk");
const cors = require("cors");

const app = express();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.use(cors());
app.use(express.static("public"));
app.use(express.json());

// Main Chat Endpoint
app.post("/ask-alexatron", async (req, res) => {
    const userMessage = req.body.message;

    // Log para makita mo sa terminal kung pumasok ang text mula sa STT
    console.log(`\n--- New Command ---`);
    console.log(`User: ${userMessage}`);

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { 
                    role: "system", 
                    content: `You are Alexatron, a smart voice assistant created by April Manalo. 
                              Tone: Concise, professional, and friendly. 
                              Rule: Always respond in English only (max 2 sentences).` 
                },
                { role: "user", content: userMessage }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.6,
        });

        const reply = chatCompletion.choices[0]?.message?.content || "System error.";
        
        console.log(`Alexatron: ${reply}`);
        res.json({ reply: reply });

    } catch (error) {
        console.error("Groq API Error:", error.message);
        res.status(500).json({ error: "Alexatron is currently overthinking." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`-------------------------------------------`);
    console.log(`🚀 ALEXATRON SERVER IS RUNNING`);
    console.log(`🌐 Local Link: http://localhost:${PORT}`);
    console.log(`🛠️ Developer: April Manalo`);
    console.log(`-------------------------------------------`);
});
