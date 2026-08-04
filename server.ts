import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import identityRouter from "./src/identity/routes";
import x402Router from "./src/identity/x402";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3014;

  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(express.json({ limit: "1mb" }));
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    next();
  });

  app.use("/api/v1/identity", identityRouter);
  app.use("/api/v1/internal/identity", identityRouter);
  app.use("/api/v1/x402", x402Router);

  app.post("/api/agents/simulate-turn", async (req, res) => {
    try {
      const { agent, task, history, mode } = req.body;

      if (!agent) {
        return res.status(400).json({ error: "Missing agent configuration." });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error: "GEMINI_API_KEY is not configured. Please add it via the Settings > Secrets panel in the AI Studio UI."
        });
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          }
        }
      });

      let contextualPrompt = "";
      if (mode === "pipeline") {
        contextualPrompt += `We are carrying out a structured hand-off pipeline to solve the task: "${task}".\n\n`;
      } else if (mode === "debate") {
        contextualPrompt += `We are holding a debate panel on the topic: "${task}".\n\n`;
      } else {
        contextualPrompt += `We are in a collaborative multi-agent group conversation for the task: "${task}".\n\n`;
      }

      if (history && history.length > 0) {
        contextualPrompt += "Here is the conversation transcript so far:\n";
        history.forEach((msg: any) => {
          contextualPrompt += `[${msg.senderName} (${msg.senderRole})]: ${msg.content}\n\n`;
        });
      } else {
        contextualPrompt += "No dialogue has occurred yet. You are starting the conversation.\n\n";
      }

      contextualPrompt += `Now, write your response as agent "${agent.name}" (Role: ${agent.role || 'Contributor'}).`;
      contextualPrompt += `Address the topic "${task}" and respond constructively to previous points (if any). Do not prefix your reply with your name or any label like "[${agent.name}]:". Deliver your response in formatted Markdown if appropriate.`;

      const systemInstruction = `You are playing the role of an AI Agent named "${agent.name}".
Your professional specialty or persona role is: "${agent.role || 'Expert'}".
Your core system instructions and behavioral attributes are:
"${agent.systemPrompt || 'Provide high quality objective critiques and solutions.'}"

CRITICAL RULES:
1. Speak absolutely as "${agent.name}". Adopt your specialty's custom tone, jargon, and depth.
2. DO NOT output code block markers surrounding your entire dialogue (unless code is specifically requested).
3. DO NOT prefix your response content with your name, like "[${agent.name}]:" or "${agent.name}:". Just write your direct speech.
4. Keep the contribution focused and avoid repeating existing content. Integrate suggestions, challenge assumptions, and keep the session progress moving forward.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contextualPrompt,
        config: {
          systemInstruction,
          temperature: typeof agent.temperature === 'number' ? agent.temperature : 0.7,
        },
      });

      const replyStr = response.text || "";
      res.json({ success: true, reply: replyStr.trim() });
    } catch (err: any) {
      console.error("Simulation error in server:", err);
      res.status(500).json({ error: err?.message || "Internal generation failed." });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

startServer();
