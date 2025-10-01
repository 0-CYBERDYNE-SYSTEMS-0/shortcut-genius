#!/usr/bin/env node

import { ShortcutActionExtractor } from './server/shortcut-action-extractor.js';
import { ActionDatabaseBuilder } from './server/action-database-builder.js';
import { GlyphMappingSystem } from './server/glyph-mapping-system.js';
import { AIActionEnhancer } from './server/ai-action-enhancer.js';
import fs from 'fs';

console.log('🧪 Testing Complete Action Database System...\n');

// Test 1: Action Extraction System
console.log('1️⃣ Testing Action Extraction System...');
try {
  const extractor = new ShortcutActionExtractor();
  const allActions = extractor.getAllActions();
  console.log(`✅ Extracted ${allActions.length} built-in actions`);

  // Test specific action
  const textAction = extractor.getAction('is.workflow.actions.gettext');
  if (textAction) {
    console.log(`✅ Found Text action: ${textAction.name}`);
    console.log(`   - Parameters: ${textAction.parameters.length}`);
    console.log(`   - Permissions: ${textAction.permissions}`);
  }
} catch (error) {
  console.error('❌ Action extraction failed:', error.message);
}

// Test 2: Glyph System
console.log('\n2️⃣ Testing Glyph Mapping System...');
try {
  const glyphSystem = new GlyphMappingSystem();
  const textGlyph = glyphSystem.getGlyphForAction('is.workflow.actions.gettext');
  const glyphInfo = glyphSystem.getGlyphInfo(textGlyph);

  if (glyphInfo) {
    console.log(`✅ Text action glyph: ${glyphInfo.name} (${textGlyph})`);
    console.log(`   - Category: ${glyphInfo.category}`);
    console.log(`   - Total glyphs available: ${glyphSystem.getAllGlyphs().length}`);
  }
} catch (error) {
  console.error('❌ Glyph system failed:', error.message);
}

// Test 3: Action Database Builder
console.log('\n3️⃣ Testing Action Database Builder...');
try {
  const builder = new ActionDatabaseBuilder();
  const testShortcuts = fs.readdirSync('./')
    .filter(file => file.endsWith('.shortcut'))
    .map(file => `./${file}`);

  console.log(`Found ${testShortcuts.length} test shortcuts`);

  if (testShortcuts.length > 0) {
    const database = await builder.buildActionDatabaseFromShortcuts(testShortcuts);
    console.log(`✅ Built database with ${database.actions.length} actions`);

    // Test getting a random action
    const randomAction = builder.getRandomAction();
    if (randomAction) {
      console.log(`✅ Random action: ${randomAction.name} (${randomAction.identifier})`);
    }
  }
} catch (error) {
  console.error('❌ Database builder failed:', error.message);
}

// Test 4: AI Action Enhancer
console.log('\n4️⃣ Testing AI Action Enhancer...');
try {
  const enhancer = new AIActionEnhancer();
  await enhancer.initialize();

  const testRequest = {
    prompt: 'Create a simple hello world shortcut that shows a notification',
    model: 'gpt-4o',
    mode: 'generate'
  };

  const enhancedResponse = await enhancer.enhanceShortcutRequest(testRequest);
  console.log('✅ Enhanced shortcut response:');
  console.log(`   - Actions: ${enhancedResponse.actions.length}`);
  console.log(`   - Total Confidence: ${enhancedResponse.metadata.totalConfidence.toFixed(2)}`);
  console.log(`   - Categories: ${enhancedResponse.metadata.categories.join(', ')}`);
  console.log(`   - Icon Glyph: ${enhancedResponse.metadata.icon.glyph}`);

  enhancedResponse.actions.forEach((action, index) => {
    console.log(`   ${index + 1}. ${action.name} (${action.confidence.toFixed(2)})`);
  });

  // Test database export
  await enhancer.exportEnhancedDatabase('./test-enhanced-database.json');
  console.log('✅ Database exported successfully');

} catch (error) {
  console.error('❌ AI enhancer failed:', error.message);
}

// Test 5: Database Integration
console.log('\n5️⃣ Testing Database Integration...');
try {
  if (fs.existsSync('./action-database.json')) {
    const database = JSON.parse(fs.readFileSync('./action-database.json', 'utf8'));
    console.log(`✅ Action database loaded with ${Object.keys(database).length} actions`);

    // Test action lookup
    const textAction = database['is.workflow.actions.gettext'];
    if (textAction) {
      console.log(`✅ Database lookup successful: ${textAction.name}`);
    }
  } else {
    console.log('⚠️  No action-database.json found');
  }
} catch (error) {
  console.error('❌ Database integration failed:', error.message);
}

console.log('\n🎉 Action database system testing complete!');
console.log('\n📋 Next Steps:');
console.log('1. Integrate action database into AI processing workflow');
console.log('2. Update system prompts to use action knowledge');
console.log('3. Test complete shortcut generation with action validation');
console.log('4. Fix API response format issues');