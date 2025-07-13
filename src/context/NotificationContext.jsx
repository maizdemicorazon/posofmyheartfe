import { createContext, useContext, useState } from 'react';
import Notifications from '../components/notifications/Notifications';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children, theme = 'light' }) => {
  const [notification, setNotification] = useState(null);

  // Función principal para mostrar notificaciones
  const showNotification = ({
    type = 'info',
    title,
    message,
    duration = 4000
  }) => {
    const newNotification = {
      id: Date.now(),
      type,
      title,
      message,
      duration
    };

    setNotification(newNotification);
  };

  // Funciones de conveniencia para diferentes tipos
  const showSuccess = (message) => {
     showNotification({ type: 'success', title: '!Exito¡', message, duration:  5000 });
  };

  const showDeleteSuccess= (message) => {
    showNotification({ type: 'success', title: '🗑️ ¡Eliminación exitosa!', message, duration:  5000 });
  };

  const showError = (message) => {
     showNotification({ type: 'error', title: 'Error', message, duration:  5000 });
  };

  const showWarning = (title, message, duration = 4000) => {
    showNotification({ type: 'warning', title, message, duration });
  };

  const showInfo = (title, message, duration = 4000) => {
    showNotification({ type: 'info', title, message, duration });
  };

  // Función para cerrar notificación
  const closeNotification = () => {
    setNotification(null);
  };

  const value = {
    showNotification,
    showSuccess,
    showDeleteSuccess,
    showError,
    showWarning,
    showInfo,
    closeNotification,
    notification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <Notifications
        notification={notification}
        onClose={closeNotification}
        theme={theme}
      />
    </NotificationContext.Provider>
  );
};