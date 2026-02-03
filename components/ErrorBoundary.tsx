
import React, { ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// Fixed: Inherit from React.Component explicitly to ensure props, state and setState are correctly typed in the TypeScript environment
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    // Fixed: Initialize state in the constructor (Property 'state' now exists due to React.Component inheritance)
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  // Fixed: Use setState which is inherited from the React.Component base class
  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    // Fixed: Access state which is inherited from the React.Component base class
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-6 font-sans">
          <div className="bg-white rounded-3xl shadow-xl p-10 max-w-lg w-full text-center border border-gray-100">
            <div className="size-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-4xl">error_outline</span>
            </div>
            <h1 className="text-2xl font-black text-gray-900 mb-2">Algo salió mal</h1>
            <p className="text-gray-500 mb-8 text-sm">
              Ha ocurrido un error inesperado al cargar la aplicación.
            </p>
            {this.state.error && (
                <div className="bg-gray-50 p-4 rounded-xl text-left mb-8 overflow-auto max-h-32 border border-gray-200">
                    <p className="font-mono text-xs text-red-600 break-words">
                        {this.state.error.toString()}
                    </p>
                </div>
            )}
            <div className="flex gap-4 justify-center">
                <button 
                    onClick={this.handleRetry} 
                    className="bg-gray-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-black transition-all shadow-lg active:scale-95 w-full"
                >
                    Recargar Aplicación
                </button>
            </div>
          </div>
        </div>
      );
    }

    // Fixed: Property 'props' is now correctly recognized as inherited from React.Component
    return this.props.children;
  }
}

export default ErrorBoundary;
