import React, { ErrorInfo, ReactNode } from 'react';

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
  // Fix: Explicitly declaring state as a class property helps TypeScript resolve 
  // 'state' on 'this' when inheritance visibility issues occur in certain build environments.
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

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
    // Fix: setState is correctly inherited from the React.Component base class.
    // Declaring the class correctly with generic types ensures its availability.
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    // Fix: Destructuring state and props at the start of render ensures that 
    // variables like 'hasError', 'error', and 'children' are available locally 
    // and correctly typed, bypassing repetitive 'this' access issues.
    const { hasError, error } = this.state;
    // Fix: Accessing props via this.props which is inherited from React.Component
    const { children } = this.props;

    // Fix: Using 'hasError' from destructured state.
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
            {/* Fix: Accessing 'error' from destructured state. */}
            {error && (
                <div className="bg-gray-50 p-4 rounded-xl text-left mb-8 overflow-auto max-h-32 border border-gray-200">
                    <p className="font-mono text-xs text-red-600 break-words">
                        {/* Fix: Safely call toString() on the typed error object. */}
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

    // Fix: Access 'children' from destructured props.
    return children || null;
  }
}

export default ErrorBoundary;