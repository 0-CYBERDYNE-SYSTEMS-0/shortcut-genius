import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import { setupVite, serveStatic } from "./vite";
import { createServer } from "http";
import net from "net";
import dotenv from "dotenv";
import { DEFAULT_PORT, requireBaseUrl } from "./runtime-config";

// Load environment variables
dotenv.config();

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", process.env.TRUST_PROXY === "true");
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));

async function canListenOnPort(port: number, host = "0.0.0.0"): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = net.createServer();

    probe.once("error", () => {
      resolve(false);
    });

    probe.once("listening", () => {
      probe.close(() => resolve(true));
    });

    probe.listen(port, host);
  });
}

async function resolveServerPort(configuredPort: string | undefined, environment: string): Promise<number> {
  const requestedPort = Number(configuredPort ?? DEFAULT_PORT);

  if (!Number.isInteger(requestedPort) || requestedPort < 0 || requestedPort > 65535) {
    throw new Error(`Invalid PORT value: ${configuredPort}`);
  }

  if (await canListenOnPort(requestedPort)) {
    return requestedPort;
  }

  if (environment !== "development") {
    throw new Error(`Port ${requestedPort} is already in use. Set PORT to a free port and try again.`);
  }

  for (let port = requestedPort + 1; port <= requestedPort + 20; port++) {
    if (await canListenOnPort(port)) {
      console.warn(`Port ${requestedPort} is in use. Falling back to port ${port} for development.`);
      return port;
    }
  }

  throw new Error(`Could not find an available development port near ${requestedPort}.`);
}

(async () => {
  const environment = app.get("env");
  const PORT = await resolveServerPort(process.env.PORT, environment);
  process.env.PORT = String(PORT);
  process.env.BASE_URL = requireBaseUrl(environment);

  const { registerRoutes } = await import("./routes");
  await registerRoutes(app);
  const server = createServer(app);

  server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE") {
      console.error(`Port ${PORT} is already in use. Stop the existing process or set PORT to a free port.`);
      process.exit(1);
    }

    console.error("Server failed to start:", error);
    process.exit(1);
  });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (environment === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  server.listen(PORT, "0.0.0.0", () => {
    const formattedTime = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });

    console.log(`${formattedTime} [express] serving on port ${PORT}`);
  });
})();
