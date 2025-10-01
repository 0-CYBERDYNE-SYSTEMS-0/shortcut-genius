# 🛡️ Security Guidelines

## 🚨 CRITICAL: API Key Security

### ❌ NEVER DO THIS:
```bash
# DON'T use VITE_ prefixed environment variables for API keys
VITE_OPENAI_API_KEY="sk-..."     # ❌ EXPOSED TO CLIENT
VITE_ANTHROPIC_API_KEY="sk-..."  # ❌ EXPOSED TO CLIENT
```

### ✅ ALWAYS DO THIS:
```bash
# Use server-only environment variables
OPENAI_API_KEY="sk-..."          # ✅ SERVER-SIDE ONLY
ANTHROPIC_API_KEY="sk-..."       # ✅ SERVER-SIDE ONLY
```

## 🔒 Security Measures Implemented

### 1. **API Key Protection**
- ✅ API keys stored server-side only
- ✅ No client-side key transmission
- ✅ Environment variable validation
- ✅ Service availability checks

### 2. **Input Validation**
- ✅ Model selection whitelist
- ✅ Request type validation
- ✅ Prompt length limits (10,000 chars)
- ✅ Suspicious content detection
- ✅ Required field validation

### 3. **Error Handling**
- ✅ Sanitized error messages
- ✅ No sensitive data in responses
- ✅ Proper HTTP status codes
- ✅ Fallback error handling

### 4. **Rate Limiting**
- ✅ Client-side rate limiting (10 req/min)
- ⚠️ TODO: Server-side rate limiting
- ⚠️ TODO: IP-based limiting
- ⚠️ TODO: User authentication

## 🔧 Security Configuration

### Environment Setup
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your API keys (server-side only)
nano .env

# Verify no VITE_ API keys are present
grep "VITE_.*API_KEY" .env  # Should return nothing
```

### Deployment Security
```bash
# Ensure .env files are never committed
git ls-files | grep "\.env"  # Should return nothing

# Verify .gitignore includes .env patterns
grep "\.env" .gitignore
```

## ⚠️ Security Checklist

Before deploying to production:

- [ ] Remove all `VITE_*_API_KEY` variables
- [ ] Verify API keys are server-side only
- [ ] Check .env files are in .gitignore
- [ ] Test that client cannot access API keys
- [ ] Implement proper authentication
- [ ] Add server-side rate limiting
- [ ] Set up monitoring and alerting
- [ ] Configure CORS properly
- [ ] Enable HTTPS in production
- [ ] Regular security audits

## 🚨 Security Incident Response

If API keys are compromised:

1. **Immediate Actions**:
   - Rotate all affected API keys
   - Revoke old keys immediately
   - Update production environment
   - Monitor for unusual usage

2. **Investigation**:
   - Check git history for exposed keys
   - Review access logs
   - Identify scope of exposure
   - Document incident

3. **Prevention**:
   - Update security guidelines
   - Improve monitoring
   - Conduct security training
   - Review deployment processes

## 📞 Reporting Security Issues

If you discover a security vulnerability:

1. **DO NOT** create a public GitHub issue
2. Email: security@shortcutgenius.com
3. Include detailed description and steps to reproduce
4. Allow reasonable time for response and fix

---

**Remember**: Security is everyone's responsibility. When in doubt, err on the side of caution.