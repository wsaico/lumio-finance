'use client';

import { useEffect, useState } from 'react';
import { Check, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSmartCategories, useLearnCategory } from '@/hooks/useSmartCategories';
import { CategoryIcon } from '@/components/icons/category-icon';
import { cn } from '@/lib/utils';

interface SmartCategorySelectorProps {
  description: string;
  selectedCategoryId?: string;
  onSelectCategory: (categoryId: string, subcategoryId?: string) => void;
  className?: string;
}

export function SmartCategorySelector({
  description,
  selectedCategoryId,
  onSelectCategory,
  className,
}: SmartCategorySelectorProps) {
  const [shouldFetch, setShouldFetch] = useState(false);
  const { data, isLoading } = useSmartCategories(description, shouldFetch);
  const learnCategory = useLearnCategory();

  // Debounce the description input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (description.length > 2) {
        setShouldFetch(true);
      } else {
        setShouldFetch(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [description]);

  const handleSelectSuggestion = (categoryId: string, subcategoryId?: string) => {
    // Pass subcategoryId (could be undefined/null if main category)
    onSelectCategory(categoryId, subcategoryId || undefined);

    // Learn this association for future suggestions
    if (description) {
      learnCategory.mutate({ description, categoryId, subcategoryId: subcategoryId || undefined });
    }
  };

  // AUTO-SELECT LOGIC
  useEffect(() => {
    if (
      data?.suggestions &&
      data.suggestions.length > 0 &&
      !selectedCategoryId // Only auto-select if nothing is selected
    ) {
      const topSuggestion = data.suggestions[0];
      // If confidence is high enough, auto-select
      if (topSuggestion.confidence > 0.79) {
        onSelectCategory(topSuggestion.categoryId, topSuggestion.subcategoryId || undefined);
      }
    }
  }, [data, selectedCategoryId, onSelectCategory]);

  // Check if we will auto-select, to prevent flicker
  const willAutoSelect =
    data?.suggestions &&
    data.suggestions.length > 0 &&
    !selectedCategoryId &&
    data.suggestions[0].confidence > 0.79;

  if (
    !shouldFetch ||
    !data?.suggestions ||
    data.suggestions.length === 0 ||
    selectedCategoryId || // Hide if a category is already selected
    willAutoSelect // Hide if we are about to auto-select (prevents flicker)
  ) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      className={cn('absolute z-10 top-full left-0 mt-1 w-full', className)}
    >
      <div className="flex flex-wrap gap-1.5 p-2 bg-popover/95 backdrop-blur-md border rounded-xl shadow-lg">
        <div className="flex items-center gap-1.5 w-full pb-1 mb-1 border-b border-border/50">
          <Sparkles className="w-3 h-3 text-primary animate-pulse" />
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Sugerencias IA</span>
        </div>

        {data.suggestions.map((suggestion) => {
          const label = suggestion.subcategoryName
            ? `${suggestion.categoryName}: ${suggestion.subcategoryName}`
            : suggestion.categoryName;

          return (
            <motion.button
              key={suggestion.subcategoryId ? `${suggestion.categoryId}|${suggestion.subcategoryId}` : suggestion.categoryId}
              type="button"
              onClick={() => handleSelectSuggestion(suggestion.categoryId, suggestion.subcategoryId || undefined)}
              whileHover={{ scale: 1.02, backgroundColor: "rgba(var(--primary), 0.1)" }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border transition-all text-xs text-left group',
                selectedCategoryId === suggestion.categoryId
                  ? 'bg-primary/10 border-primary/50 text-primary'
                  : 'bg-card border-border/50 text-foreground hover:border-primary/30'
              )}
            >
              {suggestion.categoryIcon && (
                <CategoryIcon name={suggestion.categoryIcon} className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-opacity" />
              )}
              <span className="font-medium truncate max-w-[150px]">{label}</span>

              {suggestion.confidence > 0.85 && (
                <span className="flex h-1.5 w-1.5 rounded-full bg-primary animate-pulse ml-0.5" />
              )}
            </motion.button>
          )
        })}
      </div>
    </motion.div>
  );
}
