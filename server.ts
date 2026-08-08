import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
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
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    next();
  });

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "veklom-id",
      timestamp: new Date().toISOString(),
    });
  });

  app.use("/api/v1/identity", identityRouter);
  app.use("/api/v1/internal/identity", identityRouter);
  app.use("/api/v1/x402", x402Router);

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[veklom-id] listening on 0.0.0.0:${PORT}`);
  });
}

startServer();
