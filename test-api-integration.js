#!/usr/bin/env node

// Test the action database integration
console.log('🧪 Testing Action Database Integration...\n');

// Test the API endpoint
const testRequest = async () => {
  try {
    const response = await fetch('http://localhost:4321/api/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        prompt: 'Create a simple hello world shortcut that shows a notification',
        type: 'generate',
        reasoningOptions: {}
      })
    });

    const result = await response.json();
    console.log('✅ API Response received:');
    console.log(`   - Status: ${response.status}`);
    console.log(`   - Content type: ${result.contentType || 'unknown'}`);

    if (result.shortcut) {
      console.log(`   - Shortcut name: ${result.shortcut.name}`);
      console.log(`   - Actions: ${result.shortcut.actions.length}`);

      result.shortcut.actions.forEach((action, index) => {
        console.log(`   ${index + 1}. ${action.type}`);
        if (action.parameters) {
          Object.keys(action.parameters).forEach(param => {
            console.log(`      - ${param}: ${action.parameters[param]}`);
          });
        }
      });
    }

    if (result.analysis) {
      console.log(`   - Analysis completed: ${result.analysis.summary || 'No summary'}`);
    }

  } catch (error) {
    console.error('❌ API test failed:', error.message);
  }
};

testRequest().then(() => {
  console.log('\n🎉 Action database integration test complete!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});