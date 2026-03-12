#!/usr/bin/env node

const { ActionDatabaseBuilder } = require('./server/action-database-builder');

async function buildDatabase() {
  console.log('🚀 Building iOS Shortcuts Action Database...');

  try {
    const builder = new ActionDatabaseBuilder();
    await builder.updateDatabase();

    // Show statistics
    const stats = await builder.getDatabaseStats();
    console.log('\n📊 Database Statistics:');
    console.log(`Total Actions: ${stats.totalActions}`);
    console.log(`Categories: ${stats.categories.join(', ')}`);
    console.log('\nActions by Category:');
    Object.entries(stats.actionsByCategory).forEach(([category, count]) => {
      console.log(`  ${category}: ${count}`);
    });
    console.log('\nSample Actions:');
    stats.sampleActions.forEach((action, index) => {
      console.log(`  ${index + 1}. ${action}`);
    });

    console.log('\n✅ Action database built successfully!');
    console.log(`📁 Database saved to: ${path.join(process.cwd(), 'action-database.json')}`);
    console.log(`📝 AI prompt saved to: ${path.join(process.cwd(), 'action-database-prompt.txt')}`);

  } catch (error) {
    console.error('❌ Error building database:', error);
    process.exit(1);
  }
}

buildDatabase();
