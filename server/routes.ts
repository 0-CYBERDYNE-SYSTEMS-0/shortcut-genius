import type { Express } from "express";
import { processWithAI } from "../client/src/lib/ai";

export function registerRoutes(app: Express) {
  app.post('/api/process', async (req, res) => {
    const { model, prompt } = req.body;
    
    if (!model || !prompt) {
      return res.status(400).json({
        error: 'Missing required fields'
      });
    }

    try {
      const result = await processWithAI(model, prompt, req.sessionID || '1');
      res.json(result);
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  });
}
