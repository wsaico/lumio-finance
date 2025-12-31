export interface TransactionFilters {
  dateRange?: {
    from: Date;
    to: Date;
  };
  categories?: string[];
  accounts?: string[];
  amountRange?: {
    min: number;
    max: number;
  };
  types?: ('income' | 'expense' | 'transfer')[];
  searchQuery?: string;
  tags?: string[];
  sortBy?: 'date' | 'amount' | 'category' | 'description';
  sortOrder?: 'asc' | 'desc';
}

export interface FilterPreset {
  id: string;
  name: string;
  filters: TransactionFilters;
  isDefault?: boolean;
}

export const DEFAULT_FILTER_PRESETS: FilterPreset[] = [
  {
    id: 'all',
    name: 'All Transactions',
    filters: {},
    isDefault: true,
  },
  {
    id: 'this-month',
    name: 'This Month',
    filters: {
      dateRange: {
        from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        to: new Date(),
      },
    },
  },
  {
    id: 'expenses-only',
    name: 'Expenses Only',
    filters: {
      types: ['expense'],
    },
  },
  {
    id: 'income-only',
    name: 'Income Only',
    filters: {
      types: ['income'],
    },
  },
  {
    id: 'high-value',
    name: 'High Value ($500+)',
    filters: {
      amountRange: {
        min: 500,
        max: Infinity,
      },
    },
  },
];
