
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop with Blur */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
        onClick={onCancel}
      ></div>

      {/* Modal Content */}
      <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 w-full max-w-md p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center text-center gap-4">
          <div className={`size-14 rounded-full flex items-center justify-center ${
            type === 'danger' ? 'bg-red-50 text-red-500' :
            type === 'success' ? 'bg-green-50 text-green-500' :
            'bg-blue-50 text-blue-500'
          }`}>
            <span className="material-symbols-outlined text-3xl">
              {type === 'danger' ? 'warning' : type === 'success' ? 'check_circle' : 'info'}
            </span>
          </div>

          <div>
            <h3 className="text-xl font-bold text-text-main">{title}</h3>
            <p className="text-text-secondary mt-2 text-sm leading-relaxed">{message}</p>
          </div>

          <div className="flex gap-3 w-full mt-4">
            <button
              onClick={onCancel}
              className="flex-1 py-3 rounded-xl border border-gray-200 font-semibold text-text-secondary hover:bg-gray-50 transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 py-3 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95 ${
                type === 'danger' ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30' :
                type === 'success' ? 'bg-green-500 hover:bg-green-600 shadow-green-500/30' :
                'bg-primary hover:bg-primary-hover shadow-blue-500/30'
              }`}
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
