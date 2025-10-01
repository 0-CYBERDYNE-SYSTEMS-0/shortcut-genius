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
}

export function AnalysisPane({ analysis }: AnalysisPaneProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Shortcut Analysis</CardTitle>
      </CardHeader>
      <ScrollArea className="h-[calc(100%-4rem)]">
        <CardContent className="space-y-4">
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
                <div key={index} className="rounded-md border p-3">
                  <div className="font-medium">{pattern.type}</div>
                  <div className="text-sm text-muted-foreground">
                    Frequency: {pattern.frequency}
                  </div>
                  <div className="text-sm text-muted-foreground">
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
                <div key={index} className="rounded-md border p-3">
                  <div className="font-medium">{node.action.type}</div>
                  {node.dependencies.length > 0 && (
                    <div className="text-sm text-muted-foreground">
                      Depends on: {node.dependencies.join(', ')}
                    </div>
                  )}
                  {node.dependents.length > 0 && (
                    <div className="text-sm text-muted-foreground">
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
                <div key={index} className="rounded-md border p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{optimization.type}</span>
                    <span className={`text-sm ${getImpactColor(optimization.impact)}`}>
                      {optimization.impact} impact
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {optimization.description}
                  </div>
                  <div className="mt-1 text-sm font-medium text-primary">
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
                <div key={index} className="rounded-md border p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{check.type}</span>
                    <span className={`text-sm ${getRiskColor(check.risk)}`}>
                      {check.risk} risk
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {check.description}
                  </div>
                  {check.mitigation && (
                    <div className="mt-1 text-sm font-medium text-primary">
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
                <div key={index} className="rounded-md border p-3">
                  <div className="font-medium">{check.permission}</div>
                  <div className="text-sm text-muted-foreground">
                    {check.reason}
                  </div>
                  {check.alternative && (
                    <div className="mt-1 text-sm text-primary">
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
