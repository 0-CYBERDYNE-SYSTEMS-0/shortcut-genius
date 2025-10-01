/**
 * Test script for Agentic Shortcut Builder
 * Tests the agent with Gemini 2.5 Flash image generation API
 */

import dotenv from 'dotenv';
dotenv.config();

import { OpenRouterClient } from './server/openrouter-client';
import { WebSearchTool } from './server/web-search-tool';
import { AgenticShortcutBuilder } from './server/agentic-shortcut-builder';
import fs from 'fs/promises';

async function main() {
  console.log('🧪 Testing Agentic Shortcut Builder\n');
  console.log('=' + '='.repeat(60));

  // Initialize services
  const openrouter = new OpenRouterClient(process.env.OPENROUTER_API_KEY || '');
  const webSearchTool = new WebSearchTool(
    process.env.TAVILY_API_KEY,
    'tavily'
  );

  // Load action database prompt
  const actionPrompt = await fs.readFile('./ai-action-prompt.md', 'utf8');

  const builder = new AgenticShortcutBuilder(
    openrouter,
    webSearchTool,
    actionPrompt
  );

  // Test prompt - exactly what the user asked for
  const userPrompt = `
Create a shortcut that:
1. Shows a menu to choose: "Upload Image", "Take Photo", or "Enter Prompt"
2. If Upload: select image from photos
3. If Take Photo: use camera
4. If Enter Prompt: ask for text input
5. Send to gemini-2.5-flash-image-generation API for processing
6. Display the returned image
7. Show alert asking "Save to Photos?" with Yes/No
8. If Yes: save image to photo library
  `.trim();

  console.log('\n📝 User Request:');
  console.log(userPrompt);
  console.log('\n' + '=' + '='.repeat(60));

  try {
    console.log('\n🤖 Starting agentic generation...\n');

    const result = await builder.buildShortcut(
      userPrompt,
      'anthropic/claude-3.5-sonnet', // Using Claude for best reasoning
      20 // Max iterations
    );

    console.log('\n' + '=' + '='.repeat(60));
    console.log('✅ GENERATION COMPLETE');
    console.log('=' + '='.repeat(60));
    console.log('\n📊 Metadata:');
    console.log(`  Iterations: ${result.metadata.iterations}`);
    console.log(`  Searches: ${result.metadata.searchesPerformed}`);
    console.log(`  Confidence: ${result.metadata.confidence}%`);
    console.log(`  Summary: ${result.metadata.summary}`);

    console.log('\n📱 Generated Shortcut:');
    console.log(JSON.stringify(result.shortcut, null, 2));

    // Validate NO placeholders
    const shortcutStr = JSON.stringify(result.shortcut);
    const placeholders = [
      'example.com',
      'api.example',
      'placeholder',
      'your-api-key',
      'your-endpoint'
    ];

    let hasPlaceholder = false;
    placeholders.forEach(placeholder => {
      if (shortcutStr.toLowerCase().includes(placeholder.toLowerCase())) {
        console.error(`\n❌ ERROR: Found placeholder "${placeholder}" in shortcut!`);
        hasPlaceholder = true;
      }
    });

    if (!hasPlaceholder) {
      console.log('\n✅ SUCCESS: No placeholders found - all URLs are real!');
    }

    // Save to file
    await fs.writeFile(
      './test-agentic-result.json',
      JSON.stringify({
        shortcut: result.shortcut,
        metadata: result.metadata,
        timestamp: new Date().toISOString()
      }, null, 2)
    );

    console.log('\n💾 Results saved to: test-agentic-result.json');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);
