import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useLoading } from '../context/LoadingContext';
import { useMessage } from '../context/MessageContext';
import TopNav from '../components/menu/TopNav';
import SlideMenu from "../components/menu/SlideMenu";

function Layout({ children, selectedCategory, onSelectCategory, view, setView }) {
  const { theme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { loading } = useLoading();
  const { message, setMessage } = useMessage();

  const getAlertClasses = (type) => {
    switch (type) {
      case 'success':
        return theme === 'dark'
          ? 'bg-green-900 border border-green-700 text-green-300'
          : 'bg-green-100 border border-green-400 text-green-700';
      case 'info':
        return theme === 'dark'
          ? 'bg-blue-900 border border-blue-700 text-blue-300'
          : 'bg-blue-100 border border-blue-400 text-blue-700';
      case 'error':
      default:
        return theme === 'dark'
          ? 'bg-red-900 border border-red-700 text-red-300'
          : 'bg-red-100 border border-red-400 text-red-700';
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-300 ${
        theme === 'dark'
          ? 'bg-gray-900 text-white'
          : 'bg-white text-gray-900'
      }`}
      style={{
        backgroundColor: 'var(--bg-color)',
        color: 'var(--text-color)',
      }}
    >
      {/* Loader Overlay */}
      {loading && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm" style={{ zIndex: 9999 }}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-white border-solid mb-4"></div>
            <p className="text-white text-lg font-medium">Cargando...</p>
          </div>
        </div>
      )}

      {/* Header y navegación - Solo mostrar en vista home */}
      {view === 'home' && (
        <TopNav
          selectedCategory={selectedCategory}
          onSelectCategory={onSelectCategory}
          onMenuClick={() => setIsMenuOpen(true)}
        />
      )}

      {/* Menú lateral */}
      <SlideMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        view={view}
        setView={setView}
      />

      {/* Contenido principal */}
      <div className="flex-1">
        {/* Mensajes de alerta */}
        {message && view === 'home' && (
          <div
            className={`${getAlertClasses(message.type)} px-4 py-3 rounded-lg relative mb-2 mx-4 mt-2 shadow-sm`}
            role="alert"
          >
            <strong className="font-bold">
              {message.type === 'success'
                ? '✅ ¡Éxito! '
                : message.type === 'info'
                ? 'ℹ️ Info: '
                : '❌ Upss! '}
            </strong>
            <span className="block sm:inline">{message.text}</span>
            <button
              onClick={() => setMessage(null)}
              className={`absolute top-0 bottom-0 right-0 px-4 py-3 focus:outline-none hover:opacity-75 transition-opacity ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
              }`}
              aria-label="Cerrar"
            >
              <svg className="fill-current h-6 w-6" role="button" viewBox="0 0 20 20">
                <title>Cerrar</title>
                <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/>
              </svg>
            </button>
          </div>
        )}

        {/* Contenido principal - children from App.jsx */}
        <div className="transition-colors duration-300">
          {children}
        </div>
      </div>
    </div>
  );
}

export default Layout;