import React, {
  createContext, useContext, useState, useCallback,
  useRef, type ReactNode
} from 'react'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: number
  message: string
  type: ToastType
}

interface ConfirmOptions {
  message: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

interface NotificationContextType {
  toast: (message: string, type?: ToastType) => void
  confirm: (options: ConfirmOptions | string) => Promise<boolean>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function useNotification() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotification must be used within NotificationProvider')
  return ctx
}

// ── 아이콘 & 색상 매핑
const TOAST_CONFIG: Record<ToastType, { icon: React.ReactNode; bg: string; border: string; text: string }> = {
  success: {
    icon: <CheckCircle size={18} className="text-green-500" />,
    bg: 'bg-green-50', border: 'border-green-100', text: 'text-green-800'
  },
  error: {
    icon: <XCircle size={18} className="text-red-500" />,
    bg: 'bg-red-50', border: 'border-red-100', text: 'text-red-800'
  },
  warning: {
    icon: <AlertCircle size={18} className="text-amber-500" />,
    bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-800'
  },
  info: {
    icon: <Info size={18} className="text-blue-500" />,
    bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-800'
  },
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [confirmState, setConfirmState] = useState<{
    open: boolean
    options: ConfirmOptions
    resolve: (val: boolean) => void
  } | null>(null)

  const idRef = useRef(0)

  // ── Toast
  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++idRef.current
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3500)
  }, [])

  const removeToast = (id: number) =>
    setToasts(prev => prev.filter(t => t.id !== id))

  // ── Confirm
  const confirm = useCallback((options: ConfirmOptions | string): Promise<boolean> => {
    return new Promise(resolve => {
      const normalized: ConfirmOptions = typeof options === 'string'
        ? { message: options }
        : options
      setConfirmState({ open: true, options: normalized, resolve })
    })
  }, [])

  const handleConfirm = (val: boolean) => {
    confirmState?.resolve(val)
    setConfirmState(null)
  }

  return (
    <NotificationContext.Provider value={{ toast, confirm }}>
      {children}

      {/* ── Toast 컨테이너 (우측 상단) */}
      <div className="fixed right-4 top-20 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => {
          const cfg = TOAST_CONFIG[t.type]
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-lg backdrop-blur-sm
                animate-[fadeSlideIn_0.25s_ease] min-w-[260px] max-w-[340px]
                ${cfg.bg} ${cfg.border}`}
            >
              {cfg.icon}
              <span className={`flex-1 text-sm font-medium ${cfg.text}`}>{t.message}</span>
              <button
                onClick={() => removeToast(t.id)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          )
        })}
      </div>

      {/* ── Confirm 모달 */}
      {confirmState?.open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          {/* 배경 */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => handleConfirm(false)}
          />
          {/* 다이얼로그 */}
          <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl mx-4 animate-[fadeSlideIn_0.2s_ease]">
            <div className="mb-1 flex items-start gap-3">
              <AlertCircle
                size={22}
                className={confirmState.options.danger ? 'text-red-500 mt-0.5' : 'text-primary-500 mt-0.5'}
              />
              <div>
                <p className="font-semibold text-gray-900 leading-snug">
                  {confirmState.options.message}
                </p>
                {confirmState.options.description && (
                  <p className="mt-1 text-sm text-gray-500">
                    {confirmState.options.description}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-5 flex gap-2 justify-end">
              <button
                onClick={() => handleConfirm(false)}
                className="rounded-2xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                {confirmState.options.cancelLabel ?? '취소'}
              </button>
              <button
                onClick={() => handleConfirm(true)}
                className={`rounded-2xl px-5 py-2.5 text-sm font-bold text-white transition-colors ${
                  confirmState.options.danger
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-primary-600 hover:bg-primary-700'
                }`}
              >
                {confirmState.options.confirmLabel ?? '확인'}
              </button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  )
}