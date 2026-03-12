import { setTimeout as delay } from 'node:timers/promises';

const baseUrl = process.env.BASE_URL || 'http://localhost:4321';

async function checkCapability() {
  console.log('🔍 Checking testing capability...');
  
  try {
    const response = await fetch(`${baseUrl}/api/shortcuts/test/capability`);
    const data = await response.json();
    
    console.log('\n📊 Capability Status:');
    console.log(`  Platform: ${data.platform}`);
    console.log(`  Available: ${data.available ? '✅' : '❌'}`);
    
    if (data.reason) {
      console.log(`  Reason: ${data.reason}`);
    }
    
    if (data.needsPermissions) {
      console.log(`  ⚠️  Needs permissions`);
    }
    
    return data;
  } catch (error) {
    console.error('\n❌ Failed to check capability:', error.message);
    return { available: false };
  }
}

async function testRuntime(shortcut) {
  console.log('\n🚀 Testing shortcut runtime...');
  console.log(`  Actions: ${shortcut.actions.length}`);
  
  try {
    const response = await fetch(`${baseUrl}/api/shortcuts/test/runtime`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shortcut })
    });
    
    const result = await response.json();
    
    console.log('\n📊 Test Result:');
    console.log(`  Success: ${result.success ? '✅' : '❌'}`);
    console.log(`  Execution Time: ${result.executionTime}ms`);
    console.log(`  Actions Executed: ${result.actionsExecuted}`);
    
    if (result.error) {
      console.log(`\n  ❌ Error: ${result.error.message}`);
      console.log(`     Stage: ${result.error.stage}`);
    }
    
    if (result.validationIssues && result.validationIssues.length > 0) {
      console.log(`\n  ⚠️  Validation Issues: ${result.validationIssues.length}`);
      result.validationIssues.slice(0, 3).forEach(issue => {
        console.log(`     - ${issue.severity}: ${issue.message}`);
      });
    }
    
    if (result.warnings && result.warnings.length > 0) {
      console.log(`\n  ⚠️  Warnings: ${result.warnings.length}`);
      result.warnings.slice(0, 2).forEach(warning => {
        console.log(`     - ${warning.type}: ${warning.message}`);
      });
    }
    
    if (result.output) {
      console.log(`\n  📤 Output: ${typeof result.output === 'string' ? result.output : JSON.stringify(result.output, null, 2)}`);
    }
    
    return result;
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    return null;
  }
}

async function cleanup() {
  console.log('\n🧹 Cleaning up test files...');
  
  try {
    const response = await fetch(`${baseUrl}/api/shortcuts/test/cleanup`, {
      method: 'POST'
    });
    const result = await response.json();
    console.log(`  ${result.success ? '✅' : '❌'} ${result.message || 'Cleanup completed'}`);
  } catch (error) {
    console.error('  ❌ Cleanup failed:', error.message);
  }
}

async function main() {
  console.log('🧪 Shortcut Testing System Verification\n');
  console.log('=' .repeat(50));
  
  // Wait for server to be ready
  console.log('\n⏳ Waiting for server...');
  await delay(2000);
  
  // Test 1: Check capability
  const capability = await checkCapability();
  
  if (!capability.available) {
    console.log('\n❌ Testing not available. Exiting.');
    process.exit(1);
  }
  
  // Test 2: Simple text shortcut
  console.log('\n\n📝 Test 1: Simple Text Shortcut');
  console.log('-' .repeat(50));
  
  const simpleShortcut = {
    name: 'Test Hello',
    actions: [
      {
        type: 'is.workflow.actions.gettext',
        parameters: {
          WFTextActionText: 'Hello from ShortcutGenius!'
        }
      }
    ]
  };
  
  await testRuntime(simpleShortcut);
  
  // Test 3: URL fetch shortcut (may fail without network)
  console.log('\n\n📝 Test 2: URL Fetch Shortcut');
  console.log('-' .repeat(50));
  
  const urlShortcut = {
    name: 'Test URL Fetch',
    actions: [
      {
        type: 'is.workflow.actions.url',
        parameters: {
          WFURLActionURL: 'https://httpbin.org/json'
        }
      },
      {
        type: 'is.workflow.actions.getcontentsofurl',
        parameters: {}
      }
    ]
  };
  
  await testRuntime(urlShortcut);
  
  // Cleanup
  await cleanup();
  
  console.log('\n\n✅ All tests completed!');
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
