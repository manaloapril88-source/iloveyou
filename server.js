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

    // Log para mamonitor mo ang conversation sa terminal
    console.log(`\n[USER]: ${userMessage}`);

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { 
                    role: "system", 
                    content: `You are Alexatron, a smart voice assistant created by April Manalo. 
                              Tone: Concise, helpful, and friendly. 
                              Rule: Respond in English only. Keep it very short (max 2 sentences) for voice clarity.` 
                },
                { role: "user", content: userMessage }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.6,
            max_tokens: 150, // Limit para mabilis ang response
        });

        const reply = chatCompletion.choices[0]?.message?.content || "I'm sorry, I couldn't process that.";
        
        console.log(`[ALEXATRON]: ${reply}`);
        res.json({ reply: reply });

    } catch (error) {
        console.error("GROQ API ERROR:", error.message);
        
        // Mag-send ng friendly error sa UI para hindi ma-stuck si Alexatron
        res.status(500).json({ 
            reply: "I am having trouble connecting to my brain. Please check your internet or API key." 
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`-------------------------------------------`);
    console.log(`🚀 ALEXATRON SERVER IS READY`);
    console.log(`📍 URL: http://localhost:${PORT}`);
    console.log(`🛡️ Status: Stable & Monitoring`);
    console.log(`-------------------------------------------`);
});
