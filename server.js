import express from "express";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";

const PORT = 3001;
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const app = express();
const allowedOrigins = [
  "https://tspmoai.onrender.com",
  "http://localhost:5173" // for local development, if applicable
];
app.use(cors({
  origin: function(origin, callback) {
    // allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  }
}));
app.use(express.json());

async function chatBetweenModelsStream(startMessage, sendChunk) {
  let messageA = startMessage;

  for (let i = 0; i < 6; i++) {
    // Model A speaks
    const responseA = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: messageA }] }],
      config: {
        systemInstruction:
          "You are well versed in tik tok brainrot. Always respond in brainrot terms like rizz,gyatt,skibidi, etc.",
        maxOutputTokens: 30,
      },
    });
    const textA = responseA?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    sendChunk({ model: "A", text: textA });

    // Model B responds
    const responseB = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: textA }] }],
      config: {
        systemInstruction:
          "You are well versed in tik tok brainrot. Always respond in brainrot terms like rizz,gyatt,skibidi, etc.",
        maxOutputTokens: 30,
      },
    });
    const textB = responseB?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    sendChunk({ model: "B", text: textB });

    messageA = textB;
  }
}

app.post("/api/brainrot-stream", async (req, res) => {
  const { message } = req.body;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Send initial headers
  res.flushHeaders?.();

  const sendChunk = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    await chatBetweenModelsStream(message || "Hello there", sendChunk);
    // Signal end of stream
    res.write(`event: end\ndata: done\n\n`);
    res.end();
  } catch (err) {
    res.write(`event: error\ndata: ${JSON.stringify(err.message)}\n\n`);
    res.end();
  }
});

app.listen(PORT, "0.0.0.0", () => console.log(`Backend running on port ${PORT}`));