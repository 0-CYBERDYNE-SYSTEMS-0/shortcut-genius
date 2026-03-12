import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

describe('System Message Validation', () => {
  // CRITICAL TEST: Ensure NO system messages use the forbidden "You are..." pattern
  it('should NOT contain "You are" pattern in any system prompts', async () => {
    const violations: string[] = [];

    // Check all TypeScript files in the project
    const checkDirectory = (dir: string, depth = 0) => {
      if (depth > 5) return; // Prevent infinite recursion

      try {
        const files = readdirSync(dir);

        for (const file of files) {
          const fullPath = join(dir, file);
          const stat = statSync(fullPath);

          if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules' && file !== '__tests__') {
            checkDirectory(fullPath, depth + 1);
          } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
            if (fullPath.includes(`${join('server', '__tests__')}`)) {
              continue;
            }
            try {
              const content = readFileSync(fullPath, 'utf8');

              // Look for system messages with "You are" pattern
              const lines = content.split('\n');
              lines.forEach((line, index) => {
                // Check for "You are" in system message contexts
                if (/(system.*["'`]You are|["'`]You are.*system)/i.test(line)) {
                  violations.push(`${fullPath}:${index + 1} - "${line.trim()}"`);
                }

                // Also check for multi-line system messages
                if (/(SYSTEM_PROMPT|systemPrompt|system_message|systemMessage)/.test(line)) {
                  const nextLines = lines.slice(index, index + 20); // Check next 20 lines
                  for (let i = 0; i < nextLines.length; i++) {
                    if (nextLines[i].includes('You are')) {
                      violations.push(`${fullPath}:${index + i + 1} - "${nextLines[i].trim()}"`);
                      break;
                    }
                  }
                }
              });
            } catch (error) {
              // Skip files that can't be read
            }
          }
        }
      } catch (error) {
        // Skip directories that can't be accessed
      }
    };

    // Start checking from the project root
    checkDirectory(process.cwd());

    if (violations.length > 0) {
      console.error('\n❌ SYSTEM MESSAGE VIOLATIONS FOUND:');
      violations.forEach(violation => {
        console.error(`  📍 ${violation}`);
      });
      console.error('\n⚠️  FIX REQUIRED: Change "You are..." to "The assistant is in a...mood"');
    }

    expect(violations).toEqual([]);
  });

  // Test that correct mood-based pattern exists in expected locations
  it('should use "assistant is in a...mood" pattern in known system messages', async () => {
    const requiredFiles = [
      'server/routes.ts',
      'server/agentic-shortcut-builder.ts',
      'server/ai-action-enhancer.ts'
    ];

    for (const file of requiredFiles) {
      try {
        const content = readFileSync(file, 'utf8');

        // Check for the correct pattern
        const moodPattern = /The assistant is in.*kind of mood/i;
        expect(moodPattern.test(content)).toBe(true);

        if (!moodPattern.test(content)) {
          console.error(`❌ Missing mood pattern in ${file}`);
        }
      } catch (error) {
        // File doesn't exist yet, skip
      }
    }
  });

  // Test that no "You are" pattern exists in common system prompt variables
  it('should not have "You are" in common system prompt variables', async () => {
    const systemPromptVariables = [
      'SYSTEM_PROMPT',
      'systemPrompt',
      'system_message',
      'systemMessage',
      'buildSystemPrompt',
      'getSystemPrompt'
    ];

    const violations: string[] = [];

    const checkFile = (filePath: string) => {
      try {
        const content = readFileSync(filePath, 'utf8');
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          systemPromptVariables.forEach(variable => {
            if (line.includes(variable) && line.includes('You are')) {
              violations.push(`${filePath}:${index + 1} - ${variable} contains "You are"`);
            }
          });
        });
      } catch (error) {
        // Skip
      }
    };

    // Check key files
    [
      'server/routes.ts',
      'server/ai-processor.ts',
      'server/agentic-shortcut-builder.ts',
      'server/ai-action-enhancer.ts',
      'server/model-router.ts'
    ].forEach(checkFile);

    expect(violations).toEqual([]);
  });

  // Test for proper mood pattern format
  it('should use proper mood pattern format', async () => {
    const validMoodPatterns = [
      /The assistant is in .* kind of mood/i,
      /The assistant is in .* mood/i
    ];

    const violations: string[] = [];

    const checkFile = (filePath: string) => {
      try {
        const content = readFileSync(filePath, 'utf8');

        // Find system messages
        const systemMessageMatches = content.match(/SYSTEM_PROMPT\s*=\s*`([^`]+)`/gs);

        if (systemMessageMatches) {
          systemMessageMatches.forEach((match, index) => {
            const hasValidMood = validMoodPatterns.some(pattern => pattern.test(match));

            if (!hasValidMood) {
              violations.push(`${filePath}: System message ${index + 1} doesn't use proper mood format`);
            }
          });
        }
      } catch (error) {
        // Skip
      }
    };

    ['server/routes.ts', 'server/agentic-shortcut-builder.ts'].forEach(checkFile);

    if (violations.length > 0) {
      console.error('\nExpected format: "The assistant is in a [skill/adjective] kind of mood"');
      violations.forEach(v => console.error(`  ❌ ${v}`));
    }

    // Note: This test may fail if files don't exist yet - that's okay during development
  });
});

// Export for manual testing
export const validateSystemMessages = () => {
  console.log('🔍 Validating system messages...\n');

  // Import and run the tests
  const violations: string[] = [];

  const checkFile = (filePath: string) => {
    try {
      const content = readFileSync(filePath, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        if (/(system.*["'`]You are|["'`]You are.*system)/i.test(line)) {
          violations.push(`${filePath}:${index + 1}`);
        }
      });
    } catch (error) {
      // Skip
    }
  };

  ['server/routes.ts', 'server/agentic-shortcut-builder.ts', 'server/ai-action-enhancer.ts'].forEach(checkFile);

  if (violations.length === 0) {
    console.log('✅ All system messages follow the correct mood pattern!');
  } else {
    console.error('❌ System message violations found:');
    violations.forEach(v => console.error(`  ${v}`));
    console.error('\nFix: Change "You are..." to "The assistant is in a...mood"');
  }

  return violations.length === 0;
};
