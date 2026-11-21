'use client';

import { useState } from 'react';
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

function safeEvaluate(expr: string): number {
  if (!expr) return 0;
  const sanitized = expr.replace(/÷/g, '/').replace(/×/g, '*').trim();
  // Safe math evaluation check
  if (!/^[\d\s+\-*/.()]+$/.test(sanitized)) return 0;
  try {
    const result = Function(`'use strict'; return (${sanitized})`)();
    return typeof result === 'number' && !isNaN(result) && isFinite(result) ? result : 0;
  } catch {
    return 0;
  }
}

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
    const result = safeEvaluate(expr);
    onChange(Number(result));
    setExpression('');
    setShowCalculator(false);
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
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-muted-foreground">
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
          className="w-full pl-12 pr-12 py-3.5 text-2xl font-bold text-right border border-border/80 rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent bg-muted/20 text-foreground transition-all"
        />
        {expression && (
          <button
            type="button"
            onClick={() => setExpression('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Delete className="w-4 h-4" />
          </button>
        )}
      </div>

      {showCalculator && (
        <div className="mt-3 p-4 bg-card rounded-3xl border border-border/70 shadow-lg animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-muted-foreground">
            <Calculator className="w-3.5 h-3.5 text-primary" />
            <span>Calculadora rápida</span>
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
                className="p-3 text-lg font-bold bg-muted/40 hover:bg-muted border border-border/50 rounded-2xl active:scale-95 transition-all"
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
              className="p-3 bg-muted/40 hover:bg-muted border border-border/50 rounded-2xl active:scale-95 transition-all flex items-center justify-center text-muted-foreground"
            >
              <Delete className="w-4 h-4" />
            </button>

            {operators.map((op) => (
              <button
                key={op}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleButtonClick(op);
                }}
                className="p-3 text-lg font-bold bg-primary/10 text-primary border border-primary/20 rounded-2xl hover:bg-primary/20 active:scale-95 transition-all"
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
              className="col-span-4 p-3 text-sm font-bold bg-primary text-primary-foreground rounded-2xl hover:bg-primary/90 shadow-md shadow-primary/20 active:scale-95 transition-all"
            >
              Calcular e Ingresar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
