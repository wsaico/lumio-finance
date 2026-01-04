'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart as PieChartIcon, Loader2, Info } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Sector } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency } from '@/lib/utils';
import type { WidgetProps } from '@/types/dashboard';

// Premium Color Palette
const COLORS = [
  '#10b981', // emerald-500 (Primary)
  '#3b82f6', // blue-500
  '#8b5cf6', // violet-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#64748b', // slate-500 (Others)
];

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, value, percent } = props;

  return (
    <g>
      <text x={cx} y={cy} dy={-10} textAnchor="middle" fill="#333" className="text-xl font-bold dark:fill-white">
        {payload.name}
      </text>
      <text x={cx} y={cy} dy={20} textAnchor="middle" fill="#999" className="text-sm dark:fill-gray-400">
        {`${(percent * 100).toFixed(1)}%`}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={innerRadius - 4}
        outerRadius={innerRadius - 2}
        fill={fill}
      />
    </g>
  );
};

export function CategoryBreakdownWidget({ config }: WidgetProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  // Fetch Data
  const { data, isLoading, error } = useQuery({
    queryKey: ['expense-breakdown'],
    queryFn: async () => {
      const now = new Date();
      const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const res = await fetch(`/api/analytics/expense-breakdown?month=${monthStr}`);
      if (!res.ok) throw new Error('Failed to fetch expenses');
      return res.json();
    }
  });

  const categories = useMemo(() => {
    return data?.categories || [];
  }, [data]);

  const totalExpense = useMemo(() => {
    return data?.total || 0;
  }, [data]);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm h-[300px]">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-2" />
        <p className="text-sm text-neutral-500 animate-pulse">Cargando datos...</p>
      </div>
    );
  }

  if (error || categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm h-[300px]">
        <PieChartIcon className="w-12 h-12 text-neutral-300 mb-2" />
        <p className="text-sm text-neutral-500">No hay gastos registrados este mes</p>
      </div>
    );
  }

  return (
    <motion.div
      className="p-6 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm h-full flex flex-col"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            Estructura de Gastos
            <Info className="w-4 h-4 text-neutral-400 cursor-help" />
          </h3>
          <p className="text-xs text-neutral-500">Top categorías del mes</p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-black text-neutral-900 dark:text-white">
            {formatCurrency(totalExpense, 'PEN')}
          </span>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between flex-1 gap-6">
        {/* Chart Section */}
        <div className="relative w-full h-[250px] md:w-1/2">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                activeIndex={activeIndex}
                activeShape={renderActiveShape}
                data={categories}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
                onMouseEnter={onPieEnter}
              >
                {categories.map((entry: any, index: number) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color ? entry.color : COLORS[index % COLORS.length]}
                    stroke="none"
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend Section */}
        <div className="w-full md:w-1/2 space-y-3 pr-2 overflow-y-auto max-h-[220px]">
          {categories.map((category: any, index: number) => (
            <motion.div
              key={category.name}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`flex items-center justify-between p-2 rounded-lg transition-colors cursor-pointer ${activeIndex === index ? 'bg-neutral-100 dark:bg-neutral-700/50' : 'hover:bg-neutral-50 dark:hover:bg-neutral-700/30'}`}
              onMouseEnter={() => setActiveIndex(index)}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full ring-2 ring-white dark:ring-neutral-800 shadow-sm"
                  style={{ backgroundColor: category.color || COLORS[index % COLORS.length] }}
                />
                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300 truncate max-w-[120px]">
                  {category.name}
                </span>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  {formatCurrency(category.value, 'PEN')}
                </div>
                <div className="text-xs text-neutral-400">
                  {category.percentage.toFixed(1)}%
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
