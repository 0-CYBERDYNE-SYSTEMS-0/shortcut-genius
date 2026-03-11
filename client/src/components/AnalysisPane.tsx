import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import type { AnalysisResult } from '@/lib/shortcut-analyzer';

interface AnalysisPaneProps {
  analysis: AnalysisResult;
  className?: string;
}

export function AnalysisPane({ analysis, className }: AnalysisPaneProps) {
  // Handle undefined or empty analysis
  if (!analysis || Object.keys(analysis).length === 0) {
    return (
      <Card className={`h-full ${className || ''}`}>
        <CardHeader>
          <CardTitle className="text-accent-indigo">Shortcut Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex min-h-[16rem] flex-col items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <div className="text-4xl mb-2">📊</div>
              <p>No analysis available</p>
              <p className="text-sm">
                Add actions to your shortcut or click "Analyze" to generate an analysis.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`flex h-full min-h-0 flex-col ${className || ''}`}>
      <CardHeader>
        <CardTitle className="text-accent-indigo">Shortcut Analysis</CardTitle>
      </CardHeader>
      <ScrollArea className="min-h-0 flex-1">
        <CardContent className="space-y-4 pb-5">
          <div className="grid grid-cols-1 gap-2 md:gap-3">
            <div className="min-w-0 rounded-lg border p-3">
              <div className="text-accent-indigo min-w-0 break-words text-[10px] uppercase leading-tight tracking-[0.12em] sm:text-xs">Patterns</div>
              <div className="mt-1 text-2xl font-semibold">{analysis.patterns.length}</div>
            </div>
            <div className="min-w-0 rounded-lg border p-3">
              <div className="text-accent-indigo min-w-0 break-words text-[10px] uppercase leading-tight tracking-[0.12em] sm:text-xs">Optimizations</div>
              <div className="mt-1 text-2xl font-semibold">{analysis.optimizations.length}</div>
            </div>
            <div className="min-w-0 rounded-lg border p-3">
              <div className="text-accent-indigo min-w-0 break-words text-[10px] uppercase leading-tight tracking-[0.12em] sm:text-xs">Security checks</div>
              <div className="mt-1 text-2xl font-semibold">{analysis.security.length}</div>
            </div>
            <div className="min-w-0 rounded-lg border p-3">
              <div className="text-accent-indigo min-w-0 break-words text-[10px] uppercase leading-tight tracking-[0.12em] sm:text-xs">Permissions</div>
              <div className="mt-1 text-2xl font-semibold">{analysis.permissions.length}</div>
            </div>
          </div>

          {/* Action Patterns */}
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="flex w-full justify-between">
                Action Patterns
                <ChevronDown className="h-4 w-4" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-2">
              {analysis.patterns.map((pattern, index) => (
                <div key={index} className="min-w-0 rounded-md border p-3">
                  <div className="font-medium">{pattern.type}</div>
                  <div className="break-words text-sm text-muted-foreground">
                    Frequency: {pattern.frequency}
                  </div>
                  <div className="break-words text-sm text-muted-foreground">
                    Context: {pattern.context}
                  </div>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>

          {/* Dependencies */}
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="flex w-full justify-between">
                Dependencies
                <ChevronDown className="h-4 w-4" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-2">
              {analysis.dependencies.map((node, index) => (
                <div key={index} className="min-w-0 rounded-md border p-3">
                  <div className="font-medium">{node.action.type}</div>
                  {node.dependencies.length > 0 && (
                    <div className="break-words text-sm text-muted-foreground">
                      Depends on: {node.dependencies.join(', ')}
                    </div>
                  )}
                  {node.dependents.length > 0 && (
                    <div className="break-words text-sm text-muted-foreground">
                      Used by: {node.dependents.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>

          {/* Optimizations */}
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="flex w-full justify-between">
                Optimizations
                <ChevronDown className="h-4 w-4" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-2">
              {analysis.optimizations.map((optimization, index) => (
                <div key={index} className="min-w-0 rounded-md border p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <span className="min-w-0 break-words font-medium">{optimization.type}</span>
                    <span className={`shrink-0 text-sm ${getImpactColor(optimization.impact)}`}>
                      {optimization.impact} impact
                    </span>
                  </div>
                  <div className="break-words text-sm text-muted-foreground">
                    {optimization.description}
                  </div>
                  <div className="mt-1 break-words text-sm font-medium text-primary">
                    Suggestion: {optimization.suggestion}
                  </div>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>

          {/* Security */}
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="flex w-full justify-between">
                Security Analysis
                <ChevronDown className="h-4 w-4" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-2">
              {analysis.security.map((check, index) => (
                <div key={index} className="min-w-0 rounded-md border p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <span className="min-w-0 break-words font-medium">{check.type}</span>
                    <span className={`shrink-0 text-sm ${getRiskColor(check.risk)}`}>
                      {check.risk} risk
                    </span>
                  </div>
                  <div className="break-words text-sm text-muted-foreground">
                    {check.description}
                  </div>
                  {check.mitigation && (
                    <div className="mt-1 break-words text-sm font-medium text-primary">
                      Mitigation: {check.mitigation}
                    </div>
                  )}
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>

          {/* Permissions */}
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="flex w-full justify-between">
                Required Permissions
                <ChevronDown className="h-4 w-4" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-2">
              {analysis.permissions.map((check, index) => (
                <div key={index} className="min-w-0 rounded-md border p-3">
                  <div className="font-medium">{check.permission}</div>
                  <div className="break-words text-sm text-muted-foreground">
                    {check.reason}
                  </div>
                  {check.alternative && (
                    <div className="mt-1 break-words text-sm text-primary">
                      Alternative: {check.alternative}
                    </div>
                  )}
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </ScrollArea>
    </Card>
  );
}

function getImpactColor(impact: 'high' | 'medium' | 'low'): string {
  switch (impact) {
    case 'high':
      return 'text-destructive';
    case 'medium':
      return 'text-yellow-500';
    case 'low':
      return 'text-green-500';
  }
}

function getRiskColor(risk: 'high' | 'medium' | 'low'): string {
  switch (risk) {
    case 'high':
      return 'text-destructive';
    case 'medium':
      return 'text-yellow-500';
    case 'low':
      return 'text-green-500';
  }
}
