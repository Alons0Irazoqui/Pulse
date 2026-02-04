import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary class to catch rendering errors in child components.
 * Inherits from Component to use lifecycle methods like componentDidCatch.
 */
// Fix: Explicitly extending React.Component to ensure props and setState are correctly inherited and recognized by TypeScript
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Fix: Added constructor with super(props) to correctly initialize class properties and inheritance
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to an error reporting service
    console.error("Uncaught error:", error, errorInfo);
  }

  // Use arrow function for lexical this binding to ensure access to setState
  handleRetry = () => {
    // Fix: setState is now correctly recognized as an inherited method from React.Component
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    // Fix: Destructuring state from this.state
    const { hasError, error } = this.state;
    // Fix: Accessing props via this.props which is correctly inherited from React.Component
    const { children } = this.props;

    if (hasError) {
      // Fallback UI
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
            {error && (
                <div className="bg-gray-50 p-4 rounded-xl text-left mb-8 overflow-auto max-h-32 border border-gray-200">
                    <p className="font-mono text-xs text-red-600 break-words">
                        {error.toString()}
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

    return children || null;
  }
}

export default ErrorBoundary;