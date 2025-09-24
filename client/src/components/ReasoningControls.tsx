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

interface ReasoningControlsProps {
  model: string;
  options: ReasoningOptions;
  onChange: (options: ReasoningOptions) => void;
}

export function ReasoningControls({ model, options, onChange }: ReasoningControlsProps) {
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

  return (
    <Card className="w-full mt-4">
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