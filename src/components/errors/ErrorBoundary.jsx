import React from 'react';
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

/**
 * 🛡️ ERROR BOUNDARY COMPONENT
 * Archivo: src/components/common/ErrorBoundary.jsx
 *
 * Maneja errores de JavaScript en cualquier parte del árbol de componentes,
 * registra esos errores y muestra una UI de fallback.
 */

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    // Actualiza el estado para mostrar la UI de fallback
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Registrar el error
    console.error('🛡️ ErrorBoundary caught an error:', error, errorInfo);

    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Aquí podrías enviar el error a un servicio de logging
    // logErrorToService(error, errorInfo);
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const { fallback: Fallback, showDetails = false } = this.props;

      // Si se proporciona un componente de fallback personalizado
      if (Fallback) {
        return (
          <Fallback
            error={this.state.error}
            retry={this.handleRetry}
            reload={this.handleReload}
          />
        );
      }

      // UI de fallback por defecto
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
            {/* Icono de error */}
            <div className="mb-4">
              <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto" />
            </div>

            {/* Título */}
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              ¡Oops! Algo salió mal
            </h1>

            {/* Descripción */}
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Ha ocurrido un error inesperado. Puedes intentar recargar la página
              o contactar a soporte si el problema persiste.
            </p>

            {/* Botones de acción */}
            <div className="space-y-3">
              <button
                onClick={this.handleRetry}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <ArrowPathIcon className="w-4 h-4" />
                Intentar de nuevo
              </button>

              <button
                onClick={this.handleReload}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Recargar página
              </button>
            </div>

            {/* Información de debug (solo en desarrollo) */}
            {showDetails && process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  Detalles técnicos (desarrollo)
                </summary>
                <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-700 rounded text-xs overflow-auto">
                  <p className="font-semibold text-red-600">Error:</p>
                  <pre className="whitespace-pre-wrap">{this.state.error.toString()}</pre>

                  {this.state.errorInfo && (
                    <>
                      <p className="font-semibold text-red-600 mt-2">Stack trace:</p>
                      <pre className="whitespace-pre-wrap">{this.state.errorInfo.componentStack}</pre>
                    </>
                  )}
                </div>
              </details>
            )}

            {/* Contador de reintentos */}
            {this.state.retryCount > 0 && (
              <p className="mt-4 text-xs text-gray-500">
                Intentos: {this.state.retryCount}
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * 🎯 Hook para manejo de errores en componentes funcionales
 */
export const useErrorHandler = () => {
  const [error, setError] = React.useState(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const handleError = React.useCallback((error) => {
    console.error('🛡️ Error handled by useErrorHandler:', error);
    setError(error);
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { handleError, resetError };
};

/**
 * 🚨 HOC (Higher-Order Component) para wrap componentes con ErrorBoundary
 */
export const withErrorBoundary = (Component, errorBoundaryProps = {}) => {
  const WrappedComponent = (props) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
};

/**
 * 📱 Componente de fallback específico para el POS
 */
export const POSErrorFallback = ({ error, retry, reload }) => (
  <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
    <div className="max-w-lg w-full bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8 text-center">
      {/* Logo/Icono del POS */}
      <div className="mb-6">
        <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto">
          <ExclamationTriangleIcon className="w-10 h-10 text-red-500" />
        </div>
      </div>

      {/* Título */}
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
        Sistema POS Temporalmente No Disponible
      </h1>

      {/* Descripción */}
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        Estamos experimentando dificultades técnicas. Por favor, intenta nuevamente
        o contacta al administrador del sistema.
      </p>

      {/* Botones de acción */}
      <div className="space-y-3">
        <button
          onClick={retry}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 shadow-md hover:shadow-lg font-medium"
        >
          <ArrowPathIcon className="w-5 h-5" />
          Reintentar
        </button>

        <button
          onClick={reload}
          className="w-full px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
        >
          Recargar Sistema
        </button>
      </div>

      {/* Información adicional */}
      <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <strong>Código de error:</strong> {error?.name || 'Unknown'}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
          Si el problema persiste, contacta a soporte técnico
        </p>
      </div>
    </div>
  </div>
);

/**
 * 🎨 Componente de fallback minimalista
 */
export const MinimalErrorFallback = ({ retry }) => (
  <div className="flex items-center justify-center p-8">
    <div className="text-center">
      <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Error al cargar este componente
      </p>
      <button
        onClick={retry}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
      >
        Reintentar
      </button>
    </div>
  </div>
);

export default ErrorBoundary;