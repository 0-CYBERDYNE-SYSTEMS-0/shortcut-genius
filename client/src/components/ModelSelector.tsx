import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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

// Memoized search input component to prevent re-renders
const SearchInput = React.memo(({
  searchQuery,
  onSearchChange,
  isOpen
}: {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  isOpen: boolean;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the input when the dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Use a small timeout to ensure the dropdown is fully rendered
      const timeoutId = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 50);

      return () => clearTimeout(timeoutId);
    }
  }, [isOpen]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      onSearchChange('');
      e.preventDefault();
    }
    // Prevent the select from intercepting key events
    e.stopPropagation();
  }, [onSearchChange]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value);
  }, [onSearchChange]);

  return (
    <div className="sticky top-0 z-10 p-3 bg-white border-b shadow-sm">
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          placeholder="🔍 Quick search models (e.g., 'gpt-4', 'claude', 'llama')..."
          value={searchQuery}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className="pl-10 pr-10 h-9 text-sm border-2 focus:border-blue-300 transition-colors"
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
            onMouseDown={(e) => e.preventDefault()} // Prevent input blur
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
  );
});

SearchInput.displayName = 'SearchInput';

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const [openRouterModels, setOpenRouterModels] = useState<Record<string, OpenRouterModel[]>>({});
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  // Memoized callbacks to prevent unnecessary re-renders
  const handleSearchChange = useCallback((newSearchQuery: string) => {
    setSearchQuery(newSearchQuery);
  }, []);

  const handleOpenChange = useCallback((newIsOpen: boolean) => {
    setIsOpen(newIsOpen);
  }, []);

  // Load OpenRouter models when component mounts or when selector opens
  useEffect(() => {
    if (isOpen && Object.keys(openRouterModels).length === 0) {
      loadOpenRouterModels();
    }
  }, [isOpen, openRouterModels]);

  const loadOpenRouterModels = useCallback(async () => {
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
  }, [loading]);

  // Group static models by provider (memoized)
  const staticModels = useMemo(() => ({
    openai: Object.values(MODEL_CONFIGS).filter(m => m.provider === 'openai'),
    anthropic: Object.values(MODEL_CONFIGS).filter(m => m.provider === 'anthropic'),
    openrouter: Object.values(MODEL_CONFIGS).filter(m => m.provider === 'openrouter')
  }), []);

  // Enhanced filter function with better matching (memoized)
  const filterModels = useCallback((models: any[], query: string) => {
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
  }, []);

  // Memoized filtered models
  const filteredModels = useMemo(() => ({
    openai: filterModels(staticModels.openai, searchQuery),
    anthropic: filterModels(staticModels.anthropic, searchQuery),
    openrouter: filterModels(staticModels.openrouter, searchQuery)
  }), [staticModels, searchQuery, filterModels]);

  return (
    <Select
      value={value}
      onValueChange={onChange as (value: string) => void}
      onOpenChange={handleOpenChange}
    >
      <SelectTrigger className="w-[320px]">
        <SelectValue placeholder="Select AI Model" />
      </SelectTrigger>
      <SelectContent className="max-h-[600px] w-[380px]">
        {/* Memoized Search Input */}
        <SearchInput
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          isOpen={isOpen}
        />

        {/* OpenAI Direct Models */}
        {filteredModels.openai.length > 0 && (
          <SelectGroup>
            <SelectLabel>OpenAI Direct</SelectLabel>
            {filteredModels.openai.map(model => (
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
        {filteredModels.anthropic.length > 0 && (
          <SelectGroup>
            <SelectLabel>Anthropic Direct</SelectLabel>
            {filteredModels.anthropic.map(model => (
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
              const categoryFilteredModels = filterModels(models, searchQuery);
              if (categoryFilteredModels.length === 0) return null;

              return (
                <SelectGroup key={category}>
                  <SelectLabel>OpenRouter - {category}</SelectLabel>
                  {categoryFilteredModels.slice(0, searchQuery ? 50 : 15).map(model => (
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
                  {categoryFilteredModels.length > (searchQuery ? 50 : 15) && (
                    <div className="px-2 py-1 text-xs text-muted-foreground">
                      ... and {categoryFilteredModels.length - (searchQuery ? 50 : 15)} more (search to see more)
                    </div>
                  )}
                </SelectGroup>
              );
            })}
          </>
        )}

        {/* Fallback static OpenRouter models if dynamic loading failed */}
        {!loading && Object.keys(openRouterModels).length === 0 && filteredModels.openrouter.length > 0 && (
          <SelectGroup>
            <SelectLabel>OpenRouter (Fallback)</SelectLabel>
            {filteredModels.openrouter.map(model => (
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
         filteredModels.openai.length === 0 &&
         filteredModels.anthropic.length === 0 &&
         Object.values(openRouterModels).flat().filter(m => filterModels([m], searchQuery).length > 0).length === 0 && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No models found matching "{searchQuery}"
          </div>
        )}
      </SelectContent>
    </Select>
  );
}
