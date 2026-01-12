import React from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'info' | 'success';
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'info',
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  // Visual Configuration based on Type
  const getConfig = () => {
      switch (type) {
          case 'danger': 
              return { 
                  icon: 'warning', 
                  iconColor: 'text-red-500', 
                  iconBg: 'bg-red-500/10',
                  btnColor: 'bg-red-600 hover:bg-red-500 shadow-red-900/20' 
              };
          case 'success': 
              return { 
                  icon: 'check_circle', 
                  iconColor: 'text-emerald-500', 
                  iconBg: 'bg-emerald-500/10',
                  btnColor: 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20' 
              };
          default: 
              return { 
                  icon: 'info', 
                  iconColor: 'text-blue-500', 
                  iconBg: 'bg-blue-500/10',
                  btnColor: 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20' 
              };
      }
  };

  const config = getConfig();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Dark Blur Overlay */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in duration-300" 
        onClick={onCancel}
      ></div>

      {/* Modal Card */}
      <div className="relative bg-zinc-950 rounded-2xl shadow-2xl border border-zinc-800 w-full max-w-sm overflow-hidden animate-in zoom-in-95 fade-in duration-200">
        
        {/* Glow Effect */}
        <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent ${type === 'danger' ? 'via-red-500/50' : type === 'success' ? 'via-emerald-500/50' : 'via-blue-500/50'} to-transparent opacity-50`}></div>

        <div className="p-8 flex flex-col items-center text-center">
          
          <div className={`size-16 rounded-full flex items-center justify-center mb-6 border border-zinc-800/50 ${config.iconBg}`}>
            <span className={`material-symbols-outlined text-3xl ${config.iconColor}`}>
              {config.icon}
            </span>
          </div>

          <h3 className="text-xl font-bold text-white mb-2 tracking-tight">{title}</h3>
          <p className="text-zinc-400 text-sm leading-relaxed mb-8">
            {message}
          </p>

          <div className="grid grid-cols-2 gap-3 w-full">
            <button
              onClick={onCancel}
              className="py-3 px-4 rounded-xl border border-zinc-800 bg-zinc-900/50 text-zinc-400 font-semibold text-sm hover:bg-zinc-800 hover:text-white transition-all active:scale-95"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`py-3 px-4 rounded-xl font-bold text-white text-sm shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${config.btnColor}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;