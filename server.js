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
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { 
                    role: "system", 
                    content: `You are Alexatron, a smart assistant by April Manalo.
                              You must ALWAYS respond in a valid JSON object format only.
                              Structure: {"language": "en" or "tl", "response": "your message"}
                              Rules:
                              - If user speaks Tagalog or Taglish, use "tl" and respond in Tagalog.
                              - If user speaks English, use "en" and respond in English.
                              - Keep response short (1-2 sentences).`
                },
                { role: "user", content: userMessage }
            ],
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" },
            temperature: 0.6,
        });

        const aiData = JSON.parse(chatCompletion.choices[0]?.message?.content);
        console.log(`[ALEXATRON]:`, aiData);
        res.json(aiData);

    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ language: "en", response: "System error, please try again." });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Alexatron Server: http://localhost:${PORT}`);
});
