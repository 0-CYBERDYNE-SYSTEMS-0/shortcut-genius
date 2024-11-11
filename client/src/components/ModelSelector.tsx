import { AIModel } from "@/lib/ai";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ModelSelectorProps {
  value: AIModel;
  onChange: (model: AIModel) => void;
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  return (
    <Select value={value} onValueChange={onChange as (value: string) => void}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select AI Model" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="gpt-4o">GPT-4o</SelectItem>
        <SelectItem value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</SelectItem>
      </SelectContent>
    </Select>
  );
}
