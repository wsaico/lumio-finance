import { useState, useCallback, useMemo } from 'react';
import type { TransactionFilters, FilterPreset } from '@/types/filters';
import { DEFAULT_FILTER_PRESETS } from '@/types/filters';

export function useTransactionFilters(initialFilters?: TransactionFilters) {
  const [filters, setFilters] = useState<TransactionFilters>(initialFilters || {});
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [customPresets, setCustomPresets] = useState<FilterPreset[]>([]);

  const allPresets = useMemo(
    () => [...DEFAULT_FILTER_PRESETS, ...customPresets],
    [customPresets]
  );

  const updateFilter = useCallback(
    <K extends keyof TransactionFilters>(key: K, value: TransactionFilters[K]) => {
      setFilters((prev) => ({
        ...prev,
        [key]: value,
      }));
      setActivePreset(null); // Clear active preset when manually changing filters
    },
    []
  );

  const removeFilter = useCallback((key: keyof TransactionFilters) => {
    setFilters((prev) => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return newFilters;
    });
    setActivePreset(null);
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters({});
    setActivePreset(null);
  }, []);

  const applyPreset = useCallback((presetId: string) => {
    const preset = allPresets.find((p) => p.id === presetId);
    if (preset) {
      setFilters(preset.filters);
      setActivePreset(presetId);
    }
  }, [allPresets]);

  const saveAsPreset = useCallback((name: string) => {
    const newPreset: FilterPreset = {
      id: crypto.randomUUID(),
      name,
      filters,
    };
    setCustomPresets((prev) => [...prev, newPreset]);
    setActivePreset(newPreset.id);
    return newPreset;
  }, [filters]);

  const deletePreset = useCallback((presetId: string) => {
    setCustomPresets((prev) => prev.filter((p) => p.id !== presetId));
    if (activePreset === presetId) {
      setActivePreset(null);
    }
  }, [activePreset]);

  const hasActiveFilters = useMemo(() => {
    return Object.keys(filters).length > 0;
  }, [filters]);

  const filterCount = useMemo(() => {
    return Object.keys(filters).length;
  }, [filters]);

  return {
    filters,
    setFilters,
    updateFilter,
    removeFilter,
    clearAllFilters,
    applyPreset,
    saveAsPreset,
    deletePreset,
    allPresets,
    activePreset,
    hasActiveFilters,
    filterCount,
  };
}
