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
  const PORT = 3000;

  app.use(express.json());

  // Mount Veklom ID Identity Router
  app.use("/api/v1/identity", identityRouter);
  app.use("/api/v1/internal/identity", identityRouter);
  app.use("/api/v1/x402", x402Router);

  // x402 Discovery & Veklom ID
  app.get("/.well-known/x402.json", (_req, res) => {
    res.json({
      x402_version: 2,
      provider: "Veklom ID — Sovereign Operator Registry",
      network: "eip155:8453",
      payTo: "0xCC34553b4e6332ffb9C1b61E22436ACA53113D1d",
      currency: "USDC",
      identity: {
        veklom_id_app: "6a20f24cc341f72c2f573eb5",
        veklom_id_wallet: "0x3a74772e925b54F7dAD7FD95c9Ba30825033f970",
        verification_domain: "veklom-id.vercel.app",
      },
      routes: [
        { route: "GET /api/v1/x402/identity/premium", price: "$0.01", description: "Full identity card for the paying wallet — trust score, operator stats, rank.", tags: ["veklom-id", "identity", "premium", "trust", "veklom"] },
        { route: "POST /api/v1/x402/benchmark/run", price: "$0.05", description: "Trigger a benchmark run authenticated by wallet + payment.", tags: ["veklom-id", "benchmark", "run", "veklom"] },
        { route: "POST /api/v1/x402/discovery/feature", price: "$0.02", description: "Unlock a paid Discovery feature for the paying wallet.", tags: ["veklom-id", "discovery", "feature", "veklom"] },
        { route: "GET /api/v1/x402/config", price: "free", description: "x402 merchant and payment configuration.", tags: ["veklom-id", "x402", "config"] },
        { route: "GET /api/v1/x402/ledger", price: "free", description: "All verified x402 payment events.", tags: ["veklom-id", "x402", "ledger", "audit"] },
      ],
      discovery: {
        bazaar: "https://bazaar.cdp.coinbase.com",
        veklom_id: "https://veklom-id.vercel.app",
      },
    });
  });

  // API Endpoint for Agent response generation
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
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // Construct contextual task and conversation history
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

      contextualPrompt += `Now, write your response as agent "${agent.name}" (Role: ${agent.role || 'Contributor'}).\n`;
      contextualPrompt += `Address the topic "${task}" and respond constructively to previous points (if any). Do not prefix your reply with your name or any label like "[${agent.name}]:". Deliver your response in formatted Markdown if appropriate.`;

      // Configure system instructions for agent personality/specialty
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

  // Vite development middleware vs Static Production bundle serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

startServer();
