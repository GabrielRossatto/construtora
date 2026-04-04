import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const ToastContext = createContext(null)

function createToast(type, message) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    message
  }
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const pushToast = useCallback((type, message) => {
    if (!message) return
    const toast = createToast(type, message)
    setToasts((current) => [...current, toast])
    window.setTimeout(() => dismissToast(toast.id), 4500)
  }, [dismissToast])

  const api = useMemo(() => ({
    success(message) {
      pushToast('success', message)
    },
    error(message) {
      pushToast('error', message)
    },
    info(message) {
      pushToast('info', message)
    },
    dismiss: dismissToast
  }), [dismissToast, pushToast])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-viewport" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast-item toast-${toast.type}`}>
            <div className="toast-copy">
              <strong>{toast.type === 'error' ? 'Atenção' : toast.type === 'success' ? 'Concluído' : 'Informação'}</strong>
              <p>{toast.message}</p>
            </div>
            <button type="button" onClick={() => dismissToast(toast.id)} className="toast-close" aria-label="Fechar aviso">
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast deve ser usado dentro de ToastProvider')
  }
  return context
}
