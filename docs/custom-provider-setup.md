# Custom Provider Setup Guide

## Providers Supported

The following custom providers are now fully supported:

### 1. **Zai / GLM (Zhipu AI)**
- Models: `glm/glm-4.7`, `glm/glm-4.6`, `glm/glm-4.5`
- Features: Unified reasoning + coding + agentic capabilities
- API Docs: https://docs.z.ai/guides/overview/quick-start

### 2. **MiniMax**
- Models: `minimax-direct/MiniMax-M2.5`, `minimax-direct/MiniMax-M2.1`, `minimax-direct/MiniMax-M2`
- Features: Large context, competitive for code
- API Docs: https://platform.minimax.io/docs/api-reference/text-chat

### 3. **Kimi (Moonshot)**
- Models: `kimi/kimi-k2-5`, `kimi/kimi-k2-0711-preview`
- Features: Agentic coding, 256k context
- API Docs: https://platform.moonshot.ai/

### 4. **OpenCode Zen**
- Models: `opencode/default`
- Features: Curated coding models, OpenAI-compatible
- API Docs: https://opencode.ai/zen

### 5. **OpenAI Codex**
- Models: `codex/codex-1`
- Features: ChatGPT Plus/Pro Codex via OAuth (no API key needed)
- API Docs: https://developers.openai.com/codex/cli/

---

## How to Use Custom Providers

### Step 1: Open Provider Settings

1. Click on the **Model Selector** dropdown in the top toolbar
2. Select a model from the **Coding Providers** section (e.g., "GLM-4.7")
3. A toast will appear: *"X API key not configured. Add it in Model Settings → Providers."*
4. Click on **Settings** (gear icon) in the sidebar or use the Settings button

### Step 2: Configure API Key

1. In Settings, find the **Providers** section
2. Locate the provider you want to use (e.g., "Zai / GLM")
3. Enter your API key in the input field
4. Click **Test Connection** to verify your API key works
5. Click **Save** to store the key securely

### Step 3: Use the Model

1. Go back to the Editor or Chat
2. Select your custom provider model from the dropdown
3. Type your prompt or shortcut request
4. Click **Analyze** or send a message
5. The AI will use your selected provider!

---

## Troubleshooting

### "Nothing happens" when I select a custom provider model

#### Check Server Console Logs

When you use a custom provider, the server logs detailed debug information:

```
🔧 Processing custom provider model: glm/glm-4.7
🔑 Provider: glm, has API key: true
🌐 Base URL: https://api.z.ai/api/coding/paas/v4
📝 Raw model for API: glm-4.7
💬 Sending request with 2 messages, max_tokens: 8192
✅ Response received, choices: 1
📄 Response length: 1234 chars
```

To check these logs:
1. Open your terminal where you're running the server
2. Look for the 🔧 emoji (processing model)
3. Check each step shows successfully

#### Common Issues

**Issue: "X API key not configured" error**
- **Cause:** API key not saved in provider settings
- **Fix:** Go to Settings → Providers → Add API key → Save

**Issue: "Provider: X, has API key: false"**
- **Cause:** API key is not set or was disconnected
- **Fix:** Re-enter and save the API key in provider settings

**Issue: No logs appear at all**
- **Cause:** Model routing not recognizing the model
- **Fix:** This was a bug that's now fixed! Try selecting the model again.

**Issue: Request hangs or times out**
- **Cause:** Network issue or provider API is down
- **Fix:** Check your internet connection, try again later

**Issue: Error message appears in toast**
- **Cause:** API returned an error (invalid key, rate limit, etc.)
- **Fix:** Check the error message and fix the underlying issue

#### Verify Model Selection

1. Click the model dropdown
2. Look for **"Coding Providers"** section
3. Select a model like:
   - `GLM-4.7` (green badge: "glm")
   - `MiniMax M2.5` (green badge: "minimax")
   - `Kimi K2.5` (green badge: "kimi")

If you don't see these models in the dropdown:
- Refresh the page
- Try clicking the dropdown again
- Check if server is running

---

## Model Routing Behavior

The system now correctly routes models:

1. **Custom Providers** (glm, minimax, kimi, opencode, codex)
   - Always use the exact model you selected
   - Never override your choice
   - Send requests to the correct API endpoints

2. **OpenRouter Models** (anything with '/')
   - Use the exact model you selected
   - Send to OpenRouter API
   - Any OpenRouter model works

3. **OpenAI Direct** (gpt-4o, gpt-4o-mini, etc.)
   - Use the model you selected
   - Send to OpenAI API directly

4. **Anthropic Direct** (claude-3-5-sonnet-20241022)
   - Use the model you selected
   - Send to Anthropic API directly

---

## Debug Information

### What Gets Logged

When you use a custom provider, these logs appear in the server console:

| Log | Meaning |
|------|----------|
| 🔧 Processing custom provider model | Model router recognized your selection |
| 🔑 Provider: X, has API key: true/false | API key configuration status |
| 🌐 Base URL: https://... | Which API endpoint is being used |
| 📝 Raw model for API: X | Model name after removing provider prefix |
| 💬 Sending request with... | Request is being sent to the provider |
| ✅ Response received | Provider responded successfully |
| 📄 Response length: X chars | How much data was returned |

### What to Do When Something Fails

1. **Look at the last successful log step**
   - If you see "Processing custom provider model" ✅
   - But not "Provider: X, has API key: true" ❌
   - Then API key is not configured

2. **Check the error message**
   - Toast notifications show error details
   - Server console shows stack traces
   - Error messages indicate what to fix

3. **Try a different provider**
   - If one provider fails, try another
   - Each provider has different requirements
   - Some work better for certain tasks

---

## API Key Security

- API keys are stored locally in `.local/shortcut-genius/providers.json`
- Keys are never sent to any third-party servers
- Keys are only sent to the provider's API endpoints
- You can revoke keys in your provider's dashboard at any time

---

## Getting Help

If you continue to have issues:

1. **Check the server console** for detailed error logs
2. **Copy the error message** from the toast notification
3. **Try a different provider** to see if it's specific to one API
4. **Check the provider's API status** to ensure their service is operational
5. **Report the issue** with the console logs for debugging

The debug logging feature was specifically added to help identify why custom providers might appear to "do nothing" when selected.
