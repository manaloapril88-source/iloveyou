require("dotenv").config();
const express = require("express");
const Groq = require("groq-sdk");
const cors = require("cors");

const app = express();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.use(cors());
app.use(express.static("public"));
app.use(express.json());

app.post("/ask", async (req, res) => {
    const { message } = req.body;
    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: "user", content: message }],
            model: "llama-3.3-70b-versatile",
        });

        const aiResponse = chatCompletion.choices[0]?.message?.content || "Pasensya na, hindi ko naintindihan.";
        res.json({ reply: aiResponse });
    } catch (error) {
        console.error("Groq Error:", error);
        res.status(500).json({ error: "Nagka-error sa AI." });
    }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
