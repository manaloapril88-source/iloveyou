require("dotenv").config();
const express = require("express");
const Groq = require("groq-sdk");
const cors = require("cors");

const app = express();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.use(cors());
app.use(express.static("public"));
app.use(express.json());

// Endpoint para sa chat logic ni Alexatron
app.post("/ask-alexatron", async (req, res) => {
    const userMessage = req.body.message;

    try {
        console.log("User Input:", userMessage);

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { 
                    role: "system", 
                    content: `You are Alexatron, a smart and helpful AI voice assistant.
                              
                              IDENTITY:
                              1. Your creator and developer is April Manalo.
                              2. You are professional, tech-savvy, yet friendly.

                              RULES:
                              1. You can understand Tagalog and English perfectly.
                              2. ALWAYS respond in ENGLISH only. No matter what language the user uses.
                              3. Keep your responses short and conversational (1 to 3 sentences) because you are a voice assistant.
                              4. Do not repeat the user's words. Go straight to the answer.
                              5. Since you are voice-activated via wake words like 'Computer' or 'AI', act like a high-tech computer system.` 
                },
                { role: "user", content: userMessage }
            ],
            model: "llama-3.3-70b-versatile", // Pinaka-stable at mabilis na model sa Groq
            temperature: 0.6,
        });

        const reply = chatCompletion.choices[0]?.message?.content || "System encountered an error processing your request.";
        console.log("Alexatron Output:", reply);
        
        res.json({ reply: reply });

    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ error: "Alexatron's brain is offline. Please check connection." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`-------------------------------------------`);
    console.log(`🚀 ALEXATRON IS ONLINE AND READY`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`🛠️ Developer: April Manalo`);
    console.log(`🎤 Wake Words: 'Computer' or 'AI'`);
    console.log(`-------------------------------------------`);
});
