# Shortcut Testing System Guide

## Overview

The Shortcut Testing System allows you to test iOS shortcuts directly from the ShortcutGenius IDE without downloading and manually installing them. This provides instant feedback on whether your shortcuts work correctly.

## Features

### Runtime Testing
- **Import:** Automatically imports .shortcut files into macOS Shortcuts app
- **Execute:** Runs shortcuts using the macOS `shortcuts` CLI
- **Capture:** Records execution time, output, and errors
- **Cleanup:** Automatically removes test shortcuts after testing

### Static Validation
- Pre-execution validation checks for:
  - Invalid action identifiers
  - Missing required parameters
  - Data flow issues between actions
  - Deprecated action usage
  - Placeholder values in parameters

### Detailed Reporting
- **Success/Failure** status with clear indicators
- **Execution time** measurement
- **Action count** tracking
- **Error messages** with context (stage, action index, action type)
- **Validation issues** with severity and suggested fixes
- **Warnings** for permissions and compatibility
- **Output capture** and display

## Requirements

### macOS Only
The testing system only works on macOS because it requires:
1. **Shortcuts.app** - Must be installed
2. **shortcuts CLI tool** - Built into macOS Shortcuts.app
3. **Automation permissions** - Terminal/IDE needs access to Shortcuts

### Granting Permissions
1. Open **System Settings** → **Privacy & Security**
2. Find **Shortcuts** in the list
3. Click the arrow (>) to expand
4. Enable access for:
   - **Terminal** (if running via command line)
   - **Your IDE** (if running VS Code, etc.)
5. Restart the ShortcutGenius server

## Using the Test Runner

### Basic Workflow
1. **Create or Import** a shortcut in the editor
2. **Navigate** to the **Test** tab (in mobile view)
3. **Click "Test Runtime"** button
4. **Review results** in the Test Results card
5. **Iterate** based on feedback
6. **Click "Cleanup"** when done testing

### Reading Test Results

#### Success Status ✅
```
✅ Test Passed
Execution Time: 1234ms
Actions Executed: 3
Output: {
  "result": "data here"
}
```

#### Error Status ❌
```
❌ Test Failed
Execution Time: 456ms
Actions Executed: 0

Error:
  Import Error: Failed to import shortcut file
```

#### Validation Issues
Shows problems that would prevent execution:

**ERROR:**
- Action 1 uses deprecated identifier
- Action 2: URL parameter is required

**WARNING:**
- Action 3 requires Location Services permission
- Action 4: URL followed by non-fetching action

#### Warnings
Non-blocking issues to be aware of:

**PERMISSION:**
- Action 5 requires HealthKit permission

**DATAFLOW:**
- URL action output not consumed by next action

## API Endpoints

### Check Capability
```bash
GET /api/shortcuts/test/capability
```

Returns testing availability and requirements.

### Run Test
```bash
POST /api/shortcuts/test/runtime
Content-Type: application/json

{
  "shortcut": {
    "name": "My Shortcut",
    "actions": [...]
  },
  "input": any,           // Optional input for shortcut
  "timeout": 30000,      // Timeout in ms (default: 30000)
  "skipCleanup": false    // Don't auto-delete test shortcut
}
```

Returns detailed test results.

### Cleanup Test Files
```bash
POST /api/shortcuts/test/cleanup
```

Removes temporary test shortcut files.

## Testing Scenarios

### Simple Text Output
```json
{
  "name": "Hello World",
  "actions": [
    {
      "type": "is.workflow.actions.gettext",
      "parameters": {
        "WFTextActionText": "Hello, World!"
      }
    }
  ]
}
```

### URL Fetching
```json
{
  "name": "Fetch JSON",
  "actions": [
    {
      "type": "is.workflow.actions.url",
      "parameters": {
        "WFURLActionURL": "https://api.example.com/data.json"
      }
    },
    {
      "type": "is.workflow.actions.getcontentsofurl",
      "parameters": {}
    }
  ]
}
```

### Calculations
```json
{
  "name": "Math Test",
  "actions": [
    {
      "type": "is.workflow.actions.number",
      "parameters": {
        "WFNumberActionNumber": 42
      }
    }
  ]
}
```

## Limitations

### Hardware-Specific Actions
Some shortcuts require hardware that can't be tested in headless mode:
- **Camera:** `take_photo`, `record_audio`
- **Biometrics:** Face ID, Touch ID
- **Location Services:** May require manual permission prompts
- **HealthKit:** Requires explicit authorization

### External Dependencies
- **Network APIs:** Require internet connection
- **Third-party apps:** Must be installed
- **iCloud features:** May need sign-in

### Timeout Behavior
- Default timeout: 30 seconds
- Infinite loops will be killed
- Set custom timeout: `"timeout": 60000` (60 seconds)

## Debugging Tips

### Common Errors

**"Automation permission denied"**
→ Grant Terminal/IDE access to Shortcuts in Privacy & Security

**"shortcuts command not found"**
→ Install macOS Shortcuts.app from App Store

**"Shortcut import failed"**
→ Check for syntax errors in JSON
→ Validate action identifiers are correct

**"Execution timeout"**
→ Check for infinite loops
→ Increase timeout value
→ Look for blocking actions

### Best Practices

1. **Start simple:** Test basic actions before complex workflows
2. **Add incrementally:** Build up from working baseline
3. **Check permissions:** Grant required permissions before testing
4. **Review warnings:** Address non-critical issues proactively
5. **Use validation:** Fix static issues before runtime tests

## Testing with AI Agent

The testing system integrates with the conversational AI agent:

1. **Agent generates** shortcut based on your request
2. **You click** "Test Runtime" in the Test tab
3. **Test results** show failures
4. **Agent analyzes** error messages
5. **Agent searches** web for solutions
6. **Agent generates** fixes
7. **You re-test** with corrected shortcut
8. **Iterate** until successful

This creates a rapid development cycle where the agent can debug and fix issues based on real execution feedback.

## Example Session

```bash
# User: "Create a shortcut that fetches weather and shows notification"

# AI generates shortcut with URL fetch and notification actions

# User: Navigate to Test tab, click "Test Runtime"

# System: Runs shortcut, returns error
{
  "success": false,
  "error": {
    "stage": "run",
    "message": "API error 404: Not Found"
  },
  "validationIssues": []
}

# User: Share error with AI agent in Chat tab

# Agent: "I see the URL endpoint is returning 404. Let me search for current weather API."

# Agent: Web search → finds new API endpoint

# Agent: Updates shortcut with correct URL

# User: Tests again

# System: Returns success
{
  "success": true,
  "executionTime": 1234,
  "actionsExecuted": 2,
  "output": "Weather: 72°F, Sunny"
}

# User: Downloads signed .shortcut file, it works perfectly!
```

## Troubleshooting

### Test Results Don't Appear
1. Check server is running (`npm run dev`)
2. Check browser console for errors
3. Verify macOS permission is granted
4. Restart server after granting permissions

### Shortcuts Not Being Imported
1. Open Shortcuts.app manually and check if imported shortcuts appear
2. Check if there are permission prompts
3. Look at system logs (`Console.app`) for Shortcuts errors

### Cleanup Not Working
- Manual cleanup: Open Shortcuts.app and delete "SG_TEST_*" shortcuts
- Or run cleanup API endpoint manually

## Advanced Usage

### Testing with Input Data
Some shortcuts accept input (files, text, numbers):

```javascript
const testRequest = {
  shortcut: myShortcut,
  input: {
    url: "https://example.com",
    count: 42
  },
  timeout: 30000
};
```

### Preserving Test Shortcuts
For debugging, you can keep test shortcuts:

```javascript
const testRequest = {
  shortcut: myShortcut,
  skipCleanup: true  // Don't auto-delete
};
```

Then manually inspect in Shortcuts.app.

## Support

For issues with the testing system:
1. Check this guide first
2. Review macOS Console.app for Shortcuts errors
3. Run `test-shortcut-testing.mjs` script for diagnostics
4. Open an issue on GitHub with:
   - macOS version
   - ShortcutGenius version
   - Error messages
   - Test results (sanitized)
