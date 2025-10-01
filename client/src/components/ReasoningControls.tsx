import { ReasoningOptions } from "@/lib/types";
import { supportsReasoning, supportsVerbosity } from "@/lib/models";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { useBreakpoint } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Settings } from "lucide-react";
import { useState } from "react";

interface ReasoningControlsProps {
  model: string;
  options: ReasoningOptions;
  onChange: (options: ReasoningOptions) => void;
}

export function ReasoningControls({ model, options, onChange }: ReasoningControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { isMobile, isTablet } = useBreakpoint();

  if (!supportsReasoning(model) && !supportsVerbosity(model)) {
    return null;
  }

  const handleReasoningEffortChange = (value: string) => {
    onChange({
      ...options,
      reasoning_effort: value as 'low' | 'medium' | 'high'
    });
  };

  const handleVerbosityChange = (value: string) => {
    onChange({
      ...options,
      verbosity: value as 'low' | 'medium' | 'high'
    });
  };

  // Mobile Collapsible Layout
  if (isMobile) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <Button
            variant="ghost"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full justify-between p-0 h-auto font-medium"
          >
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="text-sm">Advanced Options</span>
            </div>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CardHeader>
        {isExpanded && (
          <CardContent className="space-y-4 pt-0">
            {supportsReasoning(model) && (
              <div className="space-y-2">
                <Label htmlFor="reasoning-effort" className="text-sm font-medium">
                  Reasoning Effort
                </Label>
                <Select
                  value={options.reasoning_effort || 'medium'}
                  onValueChange={handleReasoningEffortChange}
                >
                  <SelectTrigger id="reasoning-effort" className="w-full">
                    <SelectValue placeholder="Select reasoning effort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">
                      <div className="py-1">
                        <div className="font-medium text-sm">Low</div>
                        <div className="text-xs text-muted-foreground">Faster responses</div>
                      </div>
                    </SelectItem>
                    <SelectItem value="medium">
                      <div className="py-1">
                        <div className="font-medium text-sm">Medium</div>
                        <div className="text-xs text-muted-foreground">Balanced performance</div>
                      </div>
                    </SelectItem>
                    <SelectItem value="high">
                      <div className="py-1">
                        <div className="font-medium text-sm">High</div>
                        <div className="text-xs text-muted-foreground">Maximum reasoning depth</div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {supportsVerbosity(model) && (
              <div className="space-y-2">
                <Label htmlFor="verbosity" className="text-sm font-medium">
                  Verbosity Level
                </Label>
                <Select
                  value={options.verbosity || 'medium'}
                  onValueChange={handleVerbosityChange}
                >
                  <SelectTrigger id="verbosity" className="w-full">
                    <SelectValue placeholder="Select verbosity level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">
                      <div className="py-1">
                        <div className="font-medium text-sm">Low</div>
                        <div className="text-xs text-muted-foreground">Concise responses</div>
                      </div>
                    </SelectItem>
                    <SelectItem value="medium">
                      <div className="py-1">
                        <div className="font-medium text-sm">Medium</div>
                        <div className="text-xs text-muted-foreground">Balanced detail level</div>
                      </div>
                    </SelectItem>
                    <SelectItem value="high">
                      <div className="py-1">
                        <div className="font-medium text-sm">High</div>
                        <div className="text-xs text-muted-foreground">Detailed explanations</div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    );
  }

  // Tablet Layout: More compact
  if (isTablet) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <h3 className="text-sm font-medium">Advanced Model Options</h3>
        </CardHeader>
        <CardContent className="space-y-3">
          {supportsReasoning(model) && (
            <div className="space-y-2">
              <Label htmlFor="reasoning-effort" className="text-sm">
                Reasoning Effort
              </Label>
              <Select
                value={options.reasoning_effort || 'medium'}
                onValueChange={handleReasoningEffortChange}
              >
                <SelectTrigger id="reasoning-effort" className="w-full">
                  <SelectValue placeholder="Select reasoning effort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">
                    <div className="py-1">
                      <div className="font-medium text-sm">Low</div>
                      <div className="text-xs text-muted-foreground">Faster responses</div>
                    </div>
                  </SelectItem>
                  <SelectItem value="medium">
                    <div className="py-1">
                      <div className="font-medium text-sm">Medium</div>
                      <div className="text-xs text-muted-foreground">Balanced performance</div>
                    </div>
                  </SelectItem>
                  <SelectItem value="high">
                    <div className="py-1">
                      <div className="font-medium text-sm">High</div>
                      <div className="text-xs text-muted-foreground">Maximum reasoning depth</div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {supportsVerbosity(model) && (
            <div className="space-y-2">
              <Label htmlFor="verbosity" className="text-sm">
                Verbosity Level
              </Label>
              <Select
                value={options.verbosity || 'medium'}
                onValueChange={handleVerbosityChange}
              >
                <SelectTrigger id="verbosity" className="w-full">
                  <SelectValue placeholder="Select verbosity level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">
                    <div className="py-1">
                      <div className="font-medium text-sm">Low</div>
                      <div className="text-xs text-muted-foreground">Concise responses</div>
                    </div>
                  </SelectItem>
                  <SelectItem value="medium">
                    <div className="py-1">
                      <div className="font-medium text-sm">Medium</div>
                      <div className="text-xs text-muted-foreground">Balanced detail level</div>
                    </div>
                  </SelectItem>
                  <SelectItem value="high">
                    <div className="py-1">
                      <div className="font-medium text-sm">High</div>
                      <div className="text-xs text-muted-foreground">Detailed explanations</div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Desktop Layout (original)
  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <h3 className="text-sm font-medium">Advanced Model Options</h3>
      </CardHeader>
      <CardContent className="space-y-4">
        {supportsReasoning(model) && (
          <div className="space-y-2">
            <Label htmlFor="reasoning-effort" className="text-sm">
              Reasoning Effort
            </Label>
            <Select
              value={options.reasoning_effort || 'medium'}
              onValueChange={handleReasoningEffortChange}
            >
              <SelectTrigger id="reasoning-effort" className="w-full">
                <SelectValue placeholder="Select reasoning effort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">
                  <div>
                    <div className="font-medium">Low</div>
                    <div className="text-xs text-muted-foreground">Faster responses</div>
                  </div>
                </SelectItem>
                <SelectItem value="medium">
                  <div>
                    <div className="font-medium">Medium</div>
                    <div className="text-xs text-muted-foreground">Balanced performance</div>
                  </div>
                </SelectItem>
                <SelectItem value="high">
                  <div>
                    <div className="font-medium">High</div>
                    <div className="text-xs text-muted-foreground">Maximum reasoning depth</div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {supportsVerbosity(model) && (
          <div className="space-y-2">
            <Label htmlFor="verbosity" className="text-sm">
              Verbosity Level
            </Label>
            <Select
              value={options.verbosity || 'medium'}
              onValueChange={handleVerbosityChange}
            >
              <SelectTrigger id="verbosity" className="w-full">
                <SelectValue placeholder="Select verbosity level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">
                  <div>
                    <div className="font-medium">Low</div>
                    <div className="text-xs text-muted-foreground">Concise responses</div>
                  </div>
                </SelectItem>
                <SelectItem value="medium">
                  <div>
                    <div className="font-medium">Medium</div>
                    <div className="text-xs text-muted-foreground">Balanced detail level</div>
                  </div>
                </SelectItem>
                <SelectItem value="high">
                  <div>
                    <div className="font-medium">High</div>
                    <div className="text-xs text-muted-foreground">Detailed explanations</div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </CardContent>
    </Card>
  );
}