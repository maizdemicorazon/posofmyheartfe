import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // Inicializar tema desde localStorage o usar 'light' por defecto
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') || 'light';
    }
    return 'light';
  });

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const newTheme = prev === 'light' ? 'dark' : 'light';
      // Guardar en localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('theme', newTheme);
      }
      return newTheme;
    });
  }, []);

  // Aplicar tema al documento cuando cambie
  useEffect(() => {
    const root = document.documentElement;

    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.add('theme-dark');
    } else {
      root.classList.remove('dark');
      root.classList.remove('theme-dark');
    }

    // También aplicar al body
    document.body.classList.toggle('dark', theme === 'dark');
    document.body.classList.toggle('theme-dark', theme === 'dark');

    // Actualizar variables CSS
    if (theme === 'dark') {
      root.style.setProperty('--bg-color', '#1a202c');
      root.style.setProperty('--text-color', 'white');
      root.style.setProperty('--text-title-order-color', '#1a202c');
      root.style.setProperty('--text-total-order-color', '#1a202c');
      root.style.setProperty('--bg-color-title-card-order', '#f3f3f3');
    } else {
      root.style.setProperty('--bg-color', 'white');
      root.style.setProperty('--text-color', 'black');
      root.style.setProperty('--text-title-order-color', 'white');
      root.style.setProperty('--text-total-order-color', 'white');
      root.style.setProperty('--bg-color-title-card-order', '#1a202c');
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};