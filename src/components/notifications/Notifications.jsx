import { useState, useEffect } from 'react';
import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, XMarkIcon }
from '@heroicons/react/24/outline';

const Notifications = ({
  notification,
  onClose,
  theme = 'light'
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (notification) {
      setIsVisible(true);

      // Auto-close después del tiempo especificado
      if (notification.duration && notification.duration > 0) {
        const timer = setTimeout(() => {
          handleClose();
        }, notification.duration);

        return () => clearTimeout(timer);
      }
    }
  }, [notification]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsExiting(false);
      onClose();
    }, 300);
  };

  if (!notification || !isVisible) return null;

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircleIcon className="w-6 h-6 text-green-600" />;
      case 'error':
        return <XCircleIcon className="w-6 h-6 text-red-600" />;
      case 'warning':
        return <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600" />;
      case 'info':
        return <InformationCircleIcon className="w-6 h-6 text-blue-600" />;
      default:
        return <CheckCircleIcon className="w-6 h-6 text-green-600" />;
    }
  };

  const getBackgroundColor = () => {
    if (theme === 'dark') {
      switch (notification.type) {
        case 'success':
          return 'bg-gray-800 border-green-500';
        case 'error':
          return 'bg-gray-800 border-red-500';
        case 'warning':
          return 'bg-gray-800 border-yellow-500';
        case 'info':
          return 'bg-gray-800 border-blue-500';
        default:
          return 'bg-gray-800 border-green-500';
      }
    } else {
      switch (notification.type) {
        case 'success':
          return 'bg-white border-green-200';
        case 'error':
          return 'bg-white border-red-200';
        case 'warning':
          return 'bg-white border-yellow-200';
        case 'info':
          return 'bg-white border-blue-200';
        default:
          return 'bg-white border-green-200';
      }
    }
  };

  return (
    <div className="fixed top-4 right-4 z-[9999]">
      <div
        className={`
          min-w-[320px] max-w-[450px] p-4 rounded-xl shadow-2xl border-l-4
          ${getBackgroundColor()}
          transform transition-all duration-300 ease-in-out
          ${isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
        `}
      >
        <div className="flex items-start gap-3">
          {/* Ícono */}
          <div className="flex-shrink-0 mt-1">
            {getIcon()}
          </div>

          {/* Contenido */}
          <div className="flex-1 min-w-0">
            {/* Título */}
            <h3 className={`font-bold text-lg leading-tight mb-1 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              {notification.title}
            </h3>

            {/* Mensaje */}
            <p className={`text-base leading-relaxed ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              {notification.message}
            </p>
          </div>

          {/* Botón cerrar */}
          <button
            onClick={handleClose}
            className={`flex-shrink-0 p-1 rounded-lg transition-colors ${
              theme === 'dark'
                ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            }`}
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Notifications;