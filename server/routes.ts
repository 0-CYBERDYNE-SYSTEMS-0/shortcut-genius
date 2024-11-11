import type { Express } from "express";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
// the newest Anthropic model is "claude-3-5-sonnet-20241022" which was released October 22, 2024

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });

export function registerRoutes(app: Express) {
  app.post('/api/process', async (req, res) => {
    const { model, prompt } = req.body;
    
    if (!model || !prompt) {
      return res.status(400).json({
        error: 'Missing required fields'
      });
    }

    try {
      let result;
      if (model === 'gpt-4o') {
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { 
              role: "system", 
              content: "You are an iOS Shortcuts expert. Analyze shortcuts and provide improvements in JSON format with 'analysis' and 'suggestions' fields."
            },
            { 
              role: "user", 
              content: prompt 
            }
          ],
          response_format: { type: "json_object" }
        });
        result = { content: response.choices[0].message.content || '' };
      } else if (model === 'claude-3-5-sonnet-20241022') {
        const response = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1024,
          system: "You are an iOS Shortcuts expert. Analyze shortcuts and provide improvements in JSON format with 'analysis' and 'suggestions' fields.",
          messages: [{ role: 'user', content: prompt }]
        });
        const content = response.content[0]?.type === 'text' ? response.content[0].text : '';
        result = { content };
      } else {
        return res.status(400).json({
          error: 'Invalid model specified'
        });
      }
      res.json(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      res.status(500).json({
        error: `Error processing with ${model}: ${errorMessage}`
      });
    }
  });
}
