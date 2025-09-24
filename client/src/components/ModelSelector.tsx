import { useState, useEffect } from "react";
import { AIModel, OpenRouterModel } from "@/lib/types";
import { MODEL_CONFIGS } from "@/lib/models";
import { fetchOpenRouterModels } from "@/lib/openrouter-api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";

interface ModelSelectorProps {
  value: AIModel;
  onChange: (model: AIModel) => void;
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const [openRouterModels, setOpenRouterModels] = useState<Record<string, OpenRouterModel[]>>({});
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  // Load OpenRouter models when component mounts or when selector opens
  useEffect(() => {
    if (isOpen && Object.keys(openRouterModels).length === 0) {
      loadOpenRouterModels();
    }
  }, [isOpen]);

  const loadOpenRouterModels = async () => {
    if (loading) return;

    setLoading(true);
    try {
      const response = await fetchOpenRouterModels();
      setOpenRouterModels(response.categorized);
    } catch (error) {
      console.error('Failed to load OpenRouter models:', error);
      // Fallback to static models on error
      setOpenRouterModels({});
    } finally {
      setLoading(false);
    }
  };

  // Group static models by provider
  const openaiModels = Object.values(MODEL_CONFIGS).filter(m => m.provider === 'openai');
  const anthropicModels = Object.values(MODEL_CONFIGS).filter(m => m.provider === 'anthropic');
  const staticOpenrouterModels = Object.values(MODEL_CONFIGS).filter(m => m.provider === 'openrouter');

  // Enhanced filter function with better matching
  const filterModels = (models: any[], query: string) => {
    if (!query) return models;
    const lowerQuery = query.toLowerCase();

    return models.filter(model => {
      const name = model.name.toLowerCase();
      const id = model.id.toLowerCase();
      const description = (model.description || '').toLowerCase();

      // Exact matches get priority
      if (name.includes(lowerQuery) || id.includes(lowerQuery)) return true;

      // Search in description for better results
      if (description.includes(lowerQuery)) return true;

      // Fuzzy matching for common terms
      const fuzzyTerms = ['gpt', 'claude', 'llama', 'gemini', 'mistral', 'qwen', 'deepseek'];
      if (fuzzyTerms.some(term => term.includes(lowerQuery) && (name.includes(term) || id.includes(term)))) {
        return true;
      }

      return false;
    }).sort((a, b) => {
      // Sort by relevance: exact name matches first, then ID matches, then description matches
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      const aId = a.id.toLowerCase();
      const bId = b.id.toLowerCase();

      if (aName.startsWith(lowerQuery)) return -1;
      if (bName.startsWith(lowerQuery)) return 1;
      if (aId.startsWith(lowerQuery)) return -1;
      if (bId.startsWith(lowerQuery)) return 1;

      return 0;
    });
  };

  const filteredOpenAI = filterModels(openaiModels, searchQuery);
  const filteredAnthropic = filterModels(anthropicModels, searchQuery);

  return (
    <Select
      value={value}
      onValueChange={onChange as (value: string) => void}
      onOpenChange={setIsOpen}
    >
      <SelectTrigger className="w-[320px]">
        <SelectValue placeholder="Select AI Model" />
      </SelectTrigger>
      <SelectContent className="max-h-[600px] w-[380px]">
        {/* Enhanced Search Bar */}
        <div className="sticky top-0 z-10 p-3 bg-white border-b shadow-sm">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="🔍 Quick search models (e.g., 'gpt-4', 'claude', 'llama')..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setSearchQuery('');
                  e.preventDefault();
                }
              }}
              className="pl-10 pr-10 h-9 text-sm border-2 focus:border-blue-300 transition-colors"
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
              autoFocus={isOpen}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
              >
                ×
              </button>
            )}
          </div>
          {searchQuery && (
            <div className="mt-2 text-xs text-muted-foreground">
              Press Enter to search • Press Esc to clear
            </div>
          )}
        </div>

        {/* OpenAI Direct Models */}
        {filteredOpenAI.length > 0 && (
          <SelectGroup>
            <SelectLabel>OpenAI Direct</SelectLabel>
            {filteredOpenAI.map(model => (
              <SelectItem key={model.id} value={model.id}>
                <div className="flex items-center justify-between w-full">
                  <span>{model.name}</span>
                  {model.capabilities.supportsReasoning && (
                    <span className="ml-2 px-1 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                      Reasoning
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
        )}

        {/* Anthropic Direct Models */}
        {filteredAnthropic.length > 0 && (
          <SelectGroup>
            <SelectLabel>Anthropic Direct</SelectLabel>
            {filteredAnthropic.map(model => (
              <SelectItem key={model.id} value={model.id}>
                <div className="flex items-center justify-between w-full">
                  <span>{model.name}</span>
                  <span className="ml-2 px-1 py-0.5 text-xs bg-orange-100 text-orange-800 rounded">
                    {model.category}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
        )}

        {/* Dynamic OpenRouter Models */}
        {loading && (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span className="text-sm text-muted-foreground">Loading OpenRouter models...</span>
          </div>
        )}

        {!loading && Object.keys(openRouterModels).length > 0 && (
          <>
            {Object.entries(openRouterModels).map(([category, models]) => {
              const filteredModels = filterModels(models, searchQuery);
              if (filteredModels.length === 0) return null;

              return (
                <SelectGroup key={category}>
                  <SelectLabel>OpenRouter - {category}</SelectLabel>
                  {filteredModels.slice(0, searchQuery ? 50 : 15).map(model => (
                    <SelectItem key={model.id} value={model.id}>
                      <div className="flex flex-col items-start w-full">
                        <div className="flex items-center justify-between w-full">
                          <span className="font-medium">{model.name}</span>
                          {model.context_length && (
                            <span className="ml-2 px-1 py-0.5 text-xs bg-green-100 text-green-800 rounded">
                              {model.context_length}k
                            </span>
                          )}
                        </div>
                        {model.description && (
                          <span className="text-xs text-muted-foreground truncate w-full">
                            {model.description}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                  {filteredModels.length > (searchQuery ? 50 : 15) && (
                    <div className="px-2 py-1 text-xs text-muted-foreground">
                      ... and {filteredModels.length - (searchQuery ? 50 : 15)} more (search to see more)
                    </div>
                  )}
                </SelectGroup>
              );
            })}
          </>
        )}

        {/* Fallback static OpenRouter models if dynamic loading failed */}
        {!loading && Object.keys(openRouterModels).length === 0 && staticOpenrouterModels.length > 0 && (
          <SelectGroup>
            <SelectLabel>OpenRouter (Fallback)</SelectLabel>
            {filterModels(staticOpenrouterModels, searchQuery).map(model => (
              <SelectItem key={model.id} value={model.id}>
                <div className="flex items-center justify-between w-full">
                  <span>{model.name}</span>
                  <span className="ml-2 px-1 py-0.5 text-xs bg-green-100 text-green-800 rounded">
                    {model.category}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
        )}

        {/* No results message */}
        {searchQuery &&
         filteredOpenAI.length === 0 &&
         filteredAnthropic.length === 0 &&
         Object.values(openRouterModels).flat().filter(m => filterModels([m], searchQuery).length > 0).length === 0 && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No models found matching "{searchQuery}"
          </div>
        )}
      </SelectContent>
    </Select>
  );
}
