import { ShortcutActionExtractor } from './server/shortcut-action-extractor.js';
import { GlyphMappingSystem } from './server/glyph-mapping-system.js';
import { AIActionEnhancer } from './server/ai-action-enhancer.js';

console.log('🧪 Testing iOS Shortcuts Action System...');

// Test 1: Basic Action Extraction
console.log('\n1️⃣ Testing Action Extraction...');
const extractor = new ShortcutActionExtractor();
const allActions = extractor.getAllActions();
console.log(`✅ Extracted ${allActions.length} built-in actions`);

// Test 2: Glyph System
console.log('\n2️⃣ Testing Glyph System...');
const glyphSystem = new GlyphMappingSystem();
const textGlyph = glyphSystem.getGlyphForAction('is.workflow.actions.gettext');
const glyphInfo = glyphSystem.getGlyphInfo(textGlyph);
console.log(`✅ Text action glyph: ${glyphInfo?.name} (${textGlyph})`);

// Test 3: Action Enhancement
console.log('\n3️⃣ Testing Action Enhancement...');
const enhancer = new AIActionEnhancer();
await enhancer.initialize();

const testRequest = {
  prompt: 'Create a simple hello world shortcut that shows a notification',
  model: 'gpt-4o',
  mode: 'generate'
};

try {
  const enhancedResponse = await enhancer.enhanceShortcutRequest(testRequest);
  console.log('✅ Enhanced shortcut response:');
  console.log(`   - Actions: ${enhancedResponse.actions.length}`);
  console.log(`   - Total Confidence: ${enhancedResponse.metadata.totalConfidence.toFixed(2)}`);
  console.log(`   - Categories: ${enhancedResponse.metadata.categories.join(', ')}`);
  console.log(`   - Icon Glyph: ${enhancedResponse.metadata.icon.glyph}`);

  enhancedResponse.actions.forEach((action, index) => {
    console.log(`   ${index + 1}. ${action.name} (${action.confidence.toFixed(2)})`);
  });
} catch (error) {
  console.error('❌ Error in enhancement:', error.message);
}

// Test 4: Database Export
console.log('\n4️⃣ Testing Database Export...');
try {
  await enhancer.exportEnhancedDatabase('./enhanced-action-database.json');
  console.log('✅ Database exported successfully');
} catch (error) {
  console.error('❌ Error exporting database:', error.message);
}

console.log('\n🎉 Action system testing complete!');