import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Loader2, Play, RefreshCw, AlertTriangle, CheckCircle2, XCircle, Activity } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TestResult {
  success: boolean;
  executionTime: number;
  actionsExecuted: number;
  output?: any;
  error?: {
    message: string;
    stage: 'validation' | 'import' | 'run' | 'cleanup';
    actionIndex?: number;
    actionType?: string;
  };
  warnings: Array<{
    message: string;
    type: 'permission' | 'dataflow' | 'compatibility' | 'performance';
  }>;
  validationIssues: Array<{
    severity: 'error' | 'warning';
    actionIndex: number;
    field?: string;
    message: string;
    suggestedFix?: string;
  }>;
  shortcutName?: string;
  cleanupError?: string;
}

interface TestCapability {
  available: boolean;
  reason?: string;
  needsPermissions?: boolean;
  platform: string;
}

interface TestRunnerProps {
  shortcut: any;
  onResult?: (result: TestResult) => void;
}

export function TestRunner({ shortcut, onResult }: TestRunnerProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [capability, setCapability] = useState<TestCapability | null>(null);
  const [checkingCapability, setCheckingCapability] = useState(false);
  const [testProgress, setTestProgress] = useState(0);
  const [testStage, setTestStage] = useState<string>('');
  const { toast } = useToast();

  const checkCapability = async () => {
    setCheckingCapability(true);
    try {
      const response = await fetch('/api/shortcuts/test/capability');
      const data: TestCapability = await response.json();
      setCapability(data);
      return data;
    } catch (error) {
      console.error('Failed to check capability:', error);
      setCapability({
        available: false,
        reason: 'Failed to check testing capability',
        platform: 'unknown'
      });
      return null;
    } finally {
      setCheckingCapability(false);
    }
  };

  const runTest = async () => {
    if (isRunning) return;

    // Check capability first
    const cap = await checkCapability();
    if (!cap?.available) {
      toast({
        title: 'Testing Not Available',
        description: cap.reason || 'Check macOS permissions',
        variant: 'destructive'
      });
      return;
    }

    setIsRunning(true);
    setResult(null);
    setTestProgress(0);
    setTestStage('Initializing...');

    // Toast notification for start
    toast({
      title: 'Starting Test',
      description: `Testing ${shortcut.actions?.length || 0} actions`,
    });

    try {
      setTestStage('Validating shortcut...');
      setTestProgress(20);
      await new Promise(r => setTimeout(r, 300)); // Visual feedback

      setTestStage('Building shortcut file...');
      setTestProgress(40);
      await new Promise(r => setTimeout(r, 300));

      setTestStage('Importing to Shortcuts...');
      setTestProgress(60);
      
      const response = await fetch('/api/shortcuts/test/runtime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shortcut })
      });

      setTestStage('Executing shortcut...');
      setTestProgress(80);

      const data: TestResult = await response.json();
      
      setTestStage('Cleaning up...');
      setTestProgress(100);

      setResult(data);
      onResult?.(data);

      // Toast notification for result
      if (data.success) {
        toast({
          title: 'Test Passed ✅',
          description: `Executed ${data.actionsExecuted} actions in ${data.executionTime}ms`,
        });
      } else {
        toast({
          title: 'Test Failed ❌',
          description: data.error?.message || 'Unknown error',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Test failed:', error);
      
      setResult({
        success: false,
        executionTime: 0,
        actionsExecuted: 0,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          stage: 'run'
        },
        warnings: [],
        validationIssues: []
      });

      toast({
        title: 'Test Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setIsRunning(false);
      // Reset progress after delay
      setTimeout(() => {
        setTestProgress(0);
        setTestStage('');
      }, 2000);
    }
  };

  const cleanup = async () => {
    try {
      await fetch('/api/shortcuts/test/cleanup', { method: 'POST' });
      setResult(null);
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  };

  // Auto-check capability on mount
  useState(() => {
    checkCapability();
  });

  return (
    <div className="space-y-4">
      {/* Capability Check */}
      {capability && !capability.available && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-medium">Testing not available</p>
              <p className="text-sm text-muted-foreground">{capability.reason}</p>
              {capability.needsPermissions && (
                <p className="text-sm">
                  <strong>Required:</strong> Grant Terminal/IDE access to Shortcuts in System Settings → Privacy & Security
                </p>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Test Controls */}
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <Button
            onClick={runTest}
            disabled={isRunning || !capability?.available}
            className="flex-1"
          >
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {testStage || 'Running Test...'}
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Test Runtime
              </>
            )}
          </Button>

          <Button
            onClick={cleanup}
            variant="outline"
            disabled={isRunning || !result}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Cleanup
          </Button>
        </div>

        {/* Progress Bar */}
        {isRunning && testProgress > 0 && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{testStage}</span>
              <span className="text-muted-foreground">{testProgress}%</span>
            </div>
            <Progress value={testProgress} className="h-2" />
          </div>
        )}

        {shortcut && !isRunning && (
          <div className="mt-3 text-sm text-muted-foreground flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Ready to test {shortcut.actions?.length || 0} actions
          </div>
        )}
      </Card>

      {/* Test Results */}
      {result && (
        <Card className="p-4">
          <div className="space-y-4">
            {/* Success/Error Indicator */}
            <div className="flex items-center gap-2">
              {result.success ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="font-semibold text-green-700">Test Passed</span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-500" />
                  <span className="font-semibold text-red-700">Test Failed</span>
                </>
              )}
            </div>

            {/* Execution Stats */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Execution Time:</span>{' '}
                <span className="font-medium">{result.executionTime}ms</span>
              </div>
              <div>
                <span className="text-muted-foreground">Actions Executed:</span>{' '}
                <span className="font-medium">{result.actionsExecuted}</span>
              </div>
            </div>

            {/* Error Display */}
            {result.error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium">
                      {result.error.stage.charAt(0).toUpperCase() + result.error.stage.slice(1)} Error
                    </p>
                    <p className="text-sm">{result.error.message}</p>
                    {result.error.actionIndex !== undefined && (
                      <p className="text-sm">
                        Action {result.error.actionIndex + 1}: {result.error.actionType}
                      </p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Validation Issues */}
            {result.validationIssues.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Validation Issues ({result.validationIssues.length})</h4>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {result.validationIssues.map((issue, idx) => (
                    <div
                      key={idx}
                      className={`p-2 rounded text-sm ${
                        issue.severity === 'error'
                          ? 'bg-red-50 text-red-900'
                          : 'bg-yellow-50 text-yellow-900'
                      }`}
                    >
                      <div className="flex gap-2">
                        <span className="font-medium">
                          {issue.severity.toUpperCase()}:
                        </span>
                        <span>Action {issue.actionIndex + 1}</span>
                      </div>
                      <p className="mt-1">{issue.message}</p>
                      {issue.suggestedFix && (
                        <p className="mt-1 text-xs">
                          <strong>Fix:</strong> {issue.suggestedFix}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings */}
            {result.warnings.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Warnings ({result.warnings.length})</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {result.warnings.map((warning, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded bg-blue-50 text-blue-900 text-sm"
                    >
                      <span className="font-medium">
                        {warning.type.charAt(0).toUpperCase() + warning.type.slice(1)}:
                      </span>
                      <span>{warning.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Output Display */}
            {result.output && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Output</h4>
                <pre className="p-3 bg-gray-50 rounded text-sm overflow-x-auto">
                  {typeof result.output === 'string'
                    ? result.output
                    : JSON.stringify(result.output, null, 2)}
                </pre>
              </div>
            )}

            {/* Cleanup Status */}
            {result.cleanupError && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <p className="text-sm">
                    <strong>Cleanup Note:</strong> {result.cleanupError}
                  </p>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
