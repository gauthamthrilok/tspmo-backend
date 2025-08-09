import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

async function streamChatBetweenModels(startMessage, sendChunk) {
  const string= `You are well versed in brainrot. Always respond in brainrot terms like rizz, gyatt, skibidi, etc.}`;
  let messageA = string+startMessage;
  for (let i = 0; i < 6; i++) {
    // Model A speaks
    const responseA = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemma:2b",
        prompt: `${string}\n\n${messageA}`,
        stream: false, // can be true if Ollama streaming is configured
        num_predict: 30
      })
    });
    const dataA = await responseA.json();
    const textA = dataA?.response?.trim() ?? "";
    sendChunk({ model: "A", text: textA });

    // Model B responds
    const responseB = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemma:2b",
        prompt: `${string}\n\n${textA}`,
        stream: false,
        num_predict: 30
      })
    });
    const dataB = await responseB.json();
    const textB = dataB?.response?.trim() ?? "";
    sendChunk({ model: "B", text: textB });

    messageA = textB;
  }
}

app.post("/api/brainrot-stream", async (req, res) => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive"
  });
  res.flushHeaders();

  const sendChunk = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const startMessage = req.body.message || "Hello there";
    await streamChatBetweenModels(startMessage, sendChunk);
    res.write("event: end\ndata: done\n\n");
    res.end();
  } catch (err) {
    res.write(`event: error\ndata: ${err.message}\n\n`);
    res.end();
  }
});

app.listen(3001, () => console.log("Backend running on http://localhost:3001"));
