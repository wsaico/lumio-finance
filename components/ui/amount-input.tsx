'use client';

import { useState } from 'react';
import { evaluate } from 'mathjs';
import { cn } from '@/lib/utils';
import { Delete, Calculator } from 'lucide-react';

interface AmountInputProps {
  value: number;
  onChange: (value: number) => void;
  currency?: string;
  className?: string;
  placeholder?: string;
}

const digits = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0'];
const operators = ['÷', '×', '-', '+'];

export function AmountInput({
  value,
  onChange,
  currency = '$',
  className,
  placeholder = '0.00',
}: AmountInputProps) {
  const [expression, setExpression] = useState('');
  const [showCalculator, setShowCalculator] = useState(false);

  const calculate = (expr: string) => {
    if (!expr) return;

    try {
      const sanitized = expr.replace(/÷/g, '/').replace(/×/g, '*');
      const result = evaluate(sanitized);
      onChange(Number(result));
      setExpression('');
      setShowCalculator(false);
    } catch (error) {
      console.error('Invalid expression:', error);
    }
  };

  const handleButtonClick = (btn: string) => {
    if (btn === '⌫') {
      setExpression((prev) => prev.slice(0, -1));
    } else {
      setExpression((prev) => prev + (btn === '÷' ? '/' : btn === '×' ? '*' : btn));
    }
  };

  const displayValue = expression || (value !== 0 ? value.toString() : '');

  return (
    <div className={cn('w-full', className)}>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-semibold text-neutral-500">
          {currency}
        </span>
        <input
          type="text"
          value={displayValue}
          onChange={(e) => setExpression(e.target.value)}
          onFocus={() => setShowCalculator(true)}
          onBlur={() => {
            setTimeout(() => {
              if (expression) calculate(expression);
              setShowCalculator(false);
            }, 200);
          }}
          placeholder={placeholder}
          className="w-full pl-12 pr-4 py-4 text-3xl font-bold text-right border-2 border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 transition-all"
        />
        {expression && (
          <button
            type="button"
            onClick={() => setExpression('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            <Delete className="w-5 h-5" />
          </button>
        )}
      </div>

      {showCalculator && (
        <div className="mt-4 p-4 bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-2 mb-3 text-sm text-neutral-600 dark:text-neutral-400">
            <Calculator className="w-4 h-4" />
            <span>Calculator</span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {digits.map((digit) => (
              <button
                key={digit}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleButtonClick(digit);
                }}
                className="p-4 text-xl font-semibold bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 active:scale-95 transition-all"
              >
                {digit}
              </button>
            ))}

            <button
              key="backspace"
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleButtonClick('⌫');
              }}
              className="p-4 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 active:scale-95 transition-all flex items-center justify-center"
            >
              <Delete className="w-5 h-5" />
            </button>

            {operators.map((op) => (
              <button
                key={op}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleButtonClick(op);
                }}
                className="p-4 text-xl font-semibold bg-primary-500 text-white rounded-lg hover:bg-primary-600 active:scale-95 transition-all col-span-1"
              >
                {op}
              </button>
            ))}

            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                calculate(expression);
              }}
              className="col-span-4 p-4 text-xl font-semibold bg-primary-600 text-white rounded-lg hover:bg-primary-700 active:scale-95 transition-all"
            >
              = Calculate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
