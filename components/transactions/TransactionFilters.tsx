'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Filter,
  X,
  Calendar,
  DollarSign,
  Tag,
  Search,
  ChevronDown,
  Save,
  Star,
} from 'lucide-react';
import { useTransactionFilters } from '@/hooks/useTransactionFilters';
import { cn } from '@/lib/utils';
import type { TransactionFilters as ITransactionFilters } from '@/types/filters';

interface TransactionFiltersProps {
  onFiltersChange?: (filters: ITransactionFilters) => void;
  className?: string;
}

export function TransactionFilters({ onFiltersChange, className }: TransactionFiltersProps) {
  const {
    filters,
    updateFilter,
    removeFilter,
    clearAllFilters,
    applyPreset,
    saveAsPreset,
    allPresets,
    activePreset,
    hasActiveFilters,
    filterCount,
  } = useTransactionFilters();

  const [isExpanded, setIsExpanded] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [presetName, setPresetName] = useState('');

  const handleFilterChange = <K extends keyof ITransactionFilters>(
    key: K,
    value: ITransactionFilters[K]
  ) => {
    updateFilter(key, value);
    onFiltersChange?.({ ...filters, [key]: value });
  };

  const handleSavePreset = () => {
    if (presetName.trim()) {
      saveAsPreset(presetName);
      setPresetName('');
      setShowSaveDialog(false);
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Filter Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
        >
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">Filters</span>
          {filterCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-semibold bg-primary-500 text-white rounded-full">
              {filterCount}
            </span>
          )}
          <ChevronDown
            className={cn('w-4 h-4 transition-transform', isExpanded && 'rotate-180')}
          />
        </button>

        {hasActiveFilters && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            type="button"
            onClick={clearAllFilters}
            className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
          >
            <X className="w-4 h-4" />
            Clear all
          </motion.button>
        )}
      </div>

      {/* Filter Presets */}
      <div className="flex flex-wrap gap-2">
        {allPresets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => applyPreset(preset.id)}
            className={cn(
              'px-3 py-1.5 text-sm rounded-lg border transition-all',
              activePreset === preset.id
                ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-500 text-primary-700 dark:text-primary-300'
                : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800'
            )}
          >
            {preset.isDefault && <Star className="inline w-3 h-3 mr-1" />}
            {preset.name}
          </button>
        ))}
      </div>

      {/* Expanded Filters */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg space-y-4">
              {/* Search */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-2">
                  <Search className="w-4 h-4" />
                  Search
                </label>
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={filters.searchQuery || ''}
                  onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm"
                />
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium mb-2">
                    <Calendar className="w-4 h-4" />
                    From Date
                  </label>
                  <input
                    type="date"
                    value={
                      filters.dateRange?.from
                        ? filters.dateRange.from.toISOString().split('T')[0]
                        : ''
                    }
                    onChange={(e) =>
                      handleFilterChange('dateRange', {
                        from: new Date(e.target.value),
                        to: filters.dateRange?.to || new Date(),
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium mb-2">
                    <Calendar className="w-4 h-4" />
                    To Date
                  </label>
                  <input
                    type="date"
                    value={
                      filters.dateRange?.to ? filters.dateRange.to.toISOString().split('T')[0] : ''
                    }
                    onChange={(e) =>
                      handleFilterChange('dateRange', {
                        from: filters.dateRange?.from || new Date(),
                        to: new Date(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm"
                  />
                </div>
              </div>

              {/* Amount Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium mb-2">
                    <DollarSign className="w-4 h-4" />
                    Min Amount
                  </label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={filters.amountRange?.min || ''}
                    onChange={(e) =>
                      handleFilterChange('amountRange', {
                        min: parseFloat(e.target.value) || 0,
                        max: filters.amountRange?.max || Infinity,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium mb-2">
                    <DollarSign className="w-4 h-4" />
                    Max Amount
                  </label>
                  <input
                    type="number"
                    placeholder="Unlimited"
                    value={
                      filters.amountRange?.max === Infinity ? '' : filters.amountRange?.max || ''
                    }
                    onChange={(e) =>
                      handleFilterChange('amountRange', {
                        min: filters.amountRange?.min || 0,
                        max: parseFloat(e.target.value) || Infinity,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm"
                  />
                </div>
              </div>

              {/* Transaction Types */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-2">
                  <Tag className="w-4 h-4" />
                  Transaction Type
                </label>
                <div className="flex flex-wrap gap-2">
                  {['income', 'expense', 'transfer'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        const currentTypes = filters.types || [];
                        const newTypes = currentTypes.includes(type as any)
                          ? currentTypes.filter((t) => t !== type)
                          : [...currentTypes, type as any];
                        handleFilterChange('types', newTypes.length > 0 ? newTypes : undefined);
                      }}
                      className={cn(
                        'px-3 py-1.5 text-sm rounded-lg border transition-all capitalize',
                        filters.types?.includes(type as any)
                          ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-500 text-primary-700 dark:text-primary-300'
                          : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Save Preset */}
              <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700">
                {!showSaveDialog ? (
                  <button
                    type="button"
                    onClick={() => setShowSaveDialog(true)}
                    className="flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    <Save className="w-4 h-4" />
                    Save current filters as preset
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Preset name..."
                      value={presetName}
                      onChange={(e) => setPresetName(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm"
                      onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()}
                    />
                    <button
                      type="button"
                      onClick={handleSavePreset}
                      className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowSaveDialog(false);
                        setPresetName('');
                      }}
                      className="px-4 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Filters Pills */}
      {hasActiveFilters && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap gap-2"
        >
          {filters.searchQuery && (
            <FilterPill
              label={`Search: "${filters.searchQuery}"`}
              onRemove={() => removeFilter('searchQuery')}
            />
          )}
          {filters.dateRange && (
            <FilterPill
              label={`${filters.dateRange.from.toLocaleDateString()} - ${filters.dateRange.to.toLocaleDateString()}`}
              onRemove={() => removeFilter('dateRange')}
            />
          )}
          {filters.amountRange && (
            <FilterPill
              label={`$${filters.amountRange.min} - ${filters.amountRange.max === Infinity ? '∞' : `$${filters.amountRange.max}`}`}
              onRemove={() => removeFilter('amountRange')}
            />
          )}
          {filters.types && filters.types.length > 0 && (
            <FilterPill
              label={`Types: ${filters.types.join(', ')}`}
              onRemove={() => removeFilter('types')}
            />
          )}
        </motion.div>
      )}
    </div>
  );
}

function FilterPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      className="flex items-center gap-2 px-3 py-1 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-full text-sm"
    >
      <span>{label}</span>
      <button
        type="button"
        onClick={onRemove}
        className="hover:bg-primary-100 dark:hover:bg-primary-800/30 rounded-full p-0.5 transition-colors"
      >
        <X className="w-3 h-3" />
      </button>
    </motion.div>
  );
}
