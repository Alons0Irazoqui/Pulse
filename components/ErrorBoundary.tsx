import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl shadow-xl p-10 max-w-lg w-full text-center border border-gray-100">
            <div className="size-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-4xl">error_outline</span>
            </div>
            <h1 className="text-2xl font-black text-gray-900 mb-2">Algo salió mal</h1>
            <p className="text-gray-500 mb-8">
              Ha ocurrido un error inesperado. Hemos registrado el problema. Por favor intenta recargar la página.
            </p>
            <div className="flex gap-4 justify-center">
                <button 
                    onClick={() => window.location.reload()} 
                    className="bg-gray-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-black transition-all shadow-lg active:scale-95"
                >
                    Recargar Aplicación
                </button>
                <button 
                    onClick={this.handleRetry} 
                    className="bg-white border border-gray-200 text-gray-700 px-6 py-3 rounded-xl font-bold hover:bg-gray-50 transition-all active:scale-95"
                >
                    Intentar de nuevo
                </button>
            </div>
            {this.state.error && (
                <div className="mt-8 p-4 bg-gray-50 rounded-xl text-left overflow-auto max-h-32 border border-gray-100">
                    <p className="font-mono text-xs text-red-500 break-words">{this.state.error.toString()}</p>
                </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;