'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Command, Keyboard } from 'lucide-react';
import { useEffect } from 'react';
import type { KeyboardShortcut } from '@/hooks/useKeyboardShortcuts';
import { cn } from '@/lib/utils';

interface KeyboardShortcutsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: KeyboardShortcut[];
}

export function KeyboardShortcutsDialog({
  isOpen,
  onClose,
  shortcuts,
}: KeyboardShortcutsDialogProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const groupedShortcuts = shortcuts.reduce(
    (acc, shortcut) => {
      // Categorize shortcuts
      if (['h', 't', 'b'].includes(shortcut.key.toLowerCase())) {
        acc.navigation.push(shortcut);
      } else if (['n', 'k', '/'].includes(shortcut.key.toLowerCase())) {
        acc.actions.push(shortcut);
      } else {
        acc.ui.push(shortcut);
      }
      return acc;
    },
    { navigation: [] as KeyboardShortcut[], actions: [] as KeyboardShortcut[], ui: [] as KeyboardShortcut[] }
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden pointer-events-auto">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                    <Keyboard className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                    Keyboard Shortcuts
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-neutral-500" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
                <div className="space-y-6">
                  {/* Navigation */}
                  {groupedShortcuts.navigation.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3">
                        Navigation
                      </h3>
                      <div className="space-y-2">
                        {groupedShortcuts.navigation.map((shortcut, index) => (
                          <ShortcutRow key={index} shortcut={shortcut} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  {groupedShortcuts.actions.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3">
                        Actions
                      </h3>
                      <div className="space-y-2">
                        {groupedShortcuts.actions.map((shortcut, index) => (
                          <ShortcutRow key={index} shortcut={shortcut} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* UI */}
                  {groupedShortcuts.ui.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3">
                        Interface
                      </h3>
                      <div className="space-y-2">
                        {groupedShortcuts.ui.map((shortcut, index) => (
                          <ShortcutRow key={index} shortcut={shortcut} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
                <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center">
                  Press <kbd className="px-2 py-1 bg-white dark:bg-neutral-700 rounded border border-neutral-300 dark:border-neutral-600 text-xs">Esc</kbd> to close
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function ShortcutRow({ shortcut }: { shortcut: KeyboardShortcut }) {
  const isMac = typeof window !== 'undefined' && /Mac/.test(navigator.platform);

  return (
    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
      <span className="text-sm text-neutral-700 dark:text-neutral-300">
        {shortcut.description}
      </span>
      <div className="flex items-center gap-1">
        {shortcut.ctrl && (
          <kbd className="px-2 py-1 bg-white dark:bg-neutral-700 rounded border border-neutral-300 dark:border-neutral-600 text-xs font-mono">
            {isMac ? (
              <>
                <Command className="inline w-3 h-3" /> Cmd
              </>
            ) : (
              'Ctrl'
            )}
          </kbd>
        )}
        {shortcut.shift && (
          <kbd className="px-2 py-1 bg-white dark:bg-neutral-700 rounded border border-neutral-300 dark:border-neutral-600 text-xs font-mono">
            Shift
          </kbd>
        )}
        {shortcut.alt && (
          <kbd className="px-2 py-1 bg-white dark:bg-neutral-700 rounded border border-neutral-300 dark:border-neutral-600 text-xs font-mono">
            Alt
          </kbd>
        )}
        <kbd className="px-2 py-1 bg-white dark:bg-neutral-700 rounded border border-neutral-300 dark:border-neutral-600 text-xs font-mono uppercase">
          {shortcut.key === '/' ? '/' : shortcut.key}
        </kbd>
      </div>
    </div>
  );
}
