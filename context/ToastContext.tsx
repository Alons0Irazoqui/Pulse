
import React, { createContext, useContext, useState, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    
    setToasts((prev) => {
        if (prev.length > 0 && prev[prev.length - 1].message === message) return prev;
        const newList = [...prev, { id, message, type }];
        if (newList.length > 3) newList.shift();
        return newList;
    });

    setTimeout(() => {
        setToasts((currentToasts) => currentToasts.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const getToastStyles = (type: ToastType) => {
      switch (type) {
          case 'success': return { 
              icon: 'check_circle', 
              text: 'text-emerald-400', 
              glow: 'shadow-[0_0_20px_-5px_rgba(52,211,153,0.3)]',
              border: 'border-emerald-500/20'
          };
          case 'error': return { 
              icon: 'error', 
              text: 'text-red-400', 
              glow: 'shadow-[0_0_20px_-5px_rgba(248,113,113,0.3)]',
              border: 'border-red-500/20'
          };
          default: return { 
              icon: 'info', 
              text: 'text-blue-400', 
              glow: 'shadow-[0_0_20px_-5px_rgba(96,165,250,0.3)]',
              border: 'border-blue-500/20'
          };
      }
  };

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      
      <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => {
            const style = getToastStyles(toast.type);
            return (
              <div
                key={toast.id}
                className={`pointer-events-auto min-w-[300px] max-w-sm px-4 py-3.5 rounded-2xl backdrop-blur-xl bg-black/80 border ${style.border} flex items-center gap-4 transform transition-all duration-300 animate-in slide-in-from-top-4 fade-in ${style.glow}`}
              >
                <div className={`shrink-0 ${style.text} flex items-center justify-center`}>
                  <span className="material-symbols-outlined text-[20px]">{style.icon}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white leading-snug tracking-wide">{toast.message}</p>
                </div>

                <button 
                    onClick={() => removeToast(toast.id)} 
                    className="shrink-0 text-zinc-500 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
            );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
