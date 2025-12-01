import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { createServer } from "http";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Debug: Check if environment variables are loaded
console.log('🔧 Environment Variables Loaded:');
console.log('- OPENROUTER_API_KEY exists:', !!process.env.OPENROUTER_API_KEY);
console.log('- OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
console.log('- ANTHROPIC_API_KEY exists:', !!process.env.ANTHROPIC_API_KEY);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

(async () => {
  registerRoutes(app);
  const server = createServer(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Serve the app - try environment variable first, then fallback
  // this serves both the API and the client
  const preferredPort = parseInt(process.env.PORT || "5000");
  
  // Function to try listening on a port and return the actual port used
  const tryListen = (port: number): Promise<number> => {
    return new Promise((resolve, reject) => {
      server.listen(port, "0.0.0.0", () => {
        const actualPort = (server.address() as any)?.port;
        resolve(actualPort);
      });
      
      server.once('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          reject(err);
        } else {
          console.error('Server error:', err);
          process.exit(1);
        }
      });
    });
  };
  
  // Try to start the server, incrementing port if needed
  const startServer = async (startPort: number) => {
    try {
      const actualPort = await tryListen(startPort);
      
      const formattedTime = new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
      
      if (actualPort !== startPort) {
        console.log(`${formattedTime} [express] Port ${startPort} was in use, serving on port ${actualPort}`);
      } else {
        console.log(`${formattedTime} [express] serving on port ${actualPort}`);
      }
      
      // Store the actual port in the environment for other parts of the app to use
      process.env.ACTUAL_PORT = actualPort.toString();
    } catch (err: any) {
      // Port is in use, try the next one
      const nextPort = startPort + 1;
      console.log(`Port ${startPort} is in use, trying port ${nextPort}...`);
      await startServer(nextPort);
    }
  };
  
  // Start the server
  startServer(preferredPort);
})();
