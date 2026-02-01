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
                    content: `You are Alexatron, a smart assistant created by April Manalo and the user called you computer or ai because this is your wakeword. 
                              Rule: Respond in English ONLY. 
                              Be professional, witty, and concise (max 2 sentences).` 
                },
                { role: "user", content: req.body.message }
            ],
            model: "groq/compound",
            temperature: 0.6,
        });

        const reply = chatCompletion.choices[0]?.message?.content || "I encountered an error.";
        res.json({ response: reply });
    } catch (error) {
        res.status(500).json({ response: "Server error. Please check your API key." });
    }
});

app.listen(3000, () => console.log(`🚀 Alexatron Server: http://localhost:3000`));
