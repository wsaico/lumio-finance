import { useEffect, useCallback, useRef } from 'react'

/**
 * Hook para refrescar presupuestos cuando cambian las transacciones
 * Usa eventos del navegador y visibilidad de página
 */
export function useBudgetRefresh(onRefresh: () => void, enabled: boolean = true) {
  const lastRefreshRef = useRef<number>(Date.now())
  const intervalRef = useRef<NodeJS.Timeout>()

  const handleRefresh = useCallback(() => {
    const now = Date.now()
    // Evitar refreshes muy seguidos (mínimo 2 segundos)
    if (now - lastRefreshRef.current > 2000) {
      lastRefreshRef.current = now
      onRefresh()
    }
  }, [onRefresh])

  useEffect(() => {
    if (!enabled) return

    // 1. Escuchar evento personalizado "transaction-created"
    const handleTransactionCreated = () => {
      handleRefresh()
    }

    // 2. Refrescar cuando la página se vuelve visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleRefresh()
      }
    }

    // 3. Refrescar cuando la ventana recupera el foco
    const handleFocus = () => {
      handleRefresh()
    }

    // 4. Auto-refresh cada 30 segundos (polling suave)
    intervalRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') {
        handleRefresh()
      }
    }, 30000) // 30 segundos

    // Registrar event listeners
    window.addEventListener('transaction-created', handleTransactionCreated)
    window.addEventListener('transaction-updated', handleTransactionCreated)
    window.addEventListener('transaction-deleted', handleTransactionCreated)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      // Cleanup
      window.removeEventListener('transaction-created', handleTransactionCreated)
      window.removeEventListener('transaction-updated', handleTransactionCreated)
      window.removeEventListener('transaction-deleted', handleTransactionCreated)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [enabled, handleRefresh])

  return { refresh: handleRefresh }
}

/**
 * Función helper para disparar eventos de transacción desde cualquier parte
 */
export function notifyTransactionChange(action: 'created' | 'updated' | 'deleted') {
  const event = new CustomEvent(`transaction-${action}`, {
    detail: { timestamp: Date.now() }
  })
  window.dispatchEvent(event)
}
