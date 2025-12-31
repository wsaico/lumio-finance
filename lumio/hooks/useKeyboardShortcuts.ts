import { useEffect, useCallback, useRef } from 'react';

export type KeyboardShortcut = {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  description: string;
  action: () => void;
  preventDefault?: boolean;
};

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[], enabled = true) {
  const shortcutsRef = useRef(shortcuts);

  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger shortcuts when typing in input fields
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      for (const shortcut of shortcutsRef.current) {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;
        const metaMatch = shortcut.meta ? event.metaKey : true;

        if (keyMatch && ctrlMatch && shiftMatch && altMatch && metaMatch) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault();
          }
          shortcut.action();
          break;
        }
      }
    },
    [enabled]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, enabled]);
}

export function useGlobalKeyboardShortcuts(
  onNewTransaction: () => void,
  onSearch: () => void,
  onToggleSidebar: () => void,
  onNavigateToDashboard: () => void,
  onNavigateToTransactions: () => void,
  onNavigateToBudgets: () => void,
  onShowShortcuts: () => void
) {
  const shortcuts: KeyboardShortcut[] = [
    // Navigation
    {
      key: 'h',
      ctrl: false,
      description: 'Go to Dashboard',
      action: onNavigateToDashboard,
    },
    {
      key: 't',
      ctrl: false,
      description: 'Go to Transactions',
      action: onNavigateToTransactions,
    },
    {
      key: 'b',
      ctrl: false,
      description: 'Go to Budgets',
      action: onNavigateToBudgets,
    },

    // Actions
    {
      key: 'n',
      ctrl: false,
      description: 'New Transaction',
      action: onNewTransaction,
    },
    {
      key: 'k',
      ctrl: true,
      description: 'Search',
      action: onSearch,
    },
    {
      key: '/',
      ctrl: false,
      description: 'Search',
      action: onSearch,
    },

    // UI
    {
      key: 's',
      ctrl: false,
      description: 'Toggle Sidebar',
      action: onToggleSidebar,
    },
    {
      key: '?',
      ctrl: false,
      shift: true,
      description: 'Show Keyboard Shortcuts',
      action: onShowShortcuts,
    },
  ];

  useKeyboardShortcuts(shortcuts);

  return shortcuts;
}
