import express from "express";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const app = express();
app.use(cors());
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

app.listen(3001, () => console.log("Backend running on http://localhost:3001"));
