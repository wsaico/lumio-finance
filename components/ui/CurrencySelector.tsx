'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown, Search } from 'lucide-react';
import { useCurrencies } from '@/hooks/useCurrency';
import { cn } from '@/lib/utils';

interface CurrencySelectorProps {
  value: string;
  onChange: (currency: string) => void;
  className?: string;
  disabled?: boolean;
}

export function CurrencySelector({ value, onChange, className, disabled }: CurrencySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { data: currenciesData, isLoading } = useCurrencies();

  const currencies = currenciesData || [];

  const filteredCurrencies = currencies.filter(
    (currency) =>
      currency.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      currency.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedCurrency = currencies.find((c) => c.code === value);

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'flex items-center justify-between gap-2 w-full px-3 py-2 rounded-lg border transition-colors',
          'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700',
          'hover:bg-neutral-50 dark:hover:bg-neutral-800',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        <div className="flex items-center gap-2">
          {selectedCurrency ? (
            <>
              <span className="font-mono font-semibold">{selectedCurrency.symbol}</span>
              <span className="text-sm">{selectedCurrency.code}</span>
            </>
          ) : (
            <span className="text-sm text-neutral-500">Select currency</span>
          )}
        </div>
        <ChevronDown className={cn('w-4 h-4 transition-transform', isOpen && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg z-50 overflow-hidden"
            >
              {/* Search */}
              <div className="p-2 border-b border-neutral-200 dark:border-neutral-700">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="Search currencies..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              {/* Currency List */}
              <div className="max-h-60 overflow-y-auto">
                {isLoading ? (
                  <div className="p-4 text-center text-sm text-neutral-500">Loading...</div>
                ) : filteredCurrencies.length === 0 ? (
                  <div className="p-4 text-center text-sm text-neutral-500">
                    No currencies found
                  </div>
                ) : (
                  filteredCurrencies.map((currency) => (
                    <button
                      key={currency.code}
                      type="button"
                      onClick={() => {
                        onChange(currency.code);
                        setIsOpen(false);
                        setSearchQuery('');
                      }}
                      className={cn(
                        'w-full flex items-center justify-between px-4 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors',
                        currency.code === value && 'bg-primary-50 dark:bg-primary-900/20'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-semibold text-lg">{currency.symbol}</span>
                        <div className="text-left">
                          <p className="text-sm font-medium">{currency.code}</p>
                          <p className="text-xs text-neutral-500">{currency.name}</p>
                        </div>
                      </div>
                      {currency.code === value && (
                        <Check className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
