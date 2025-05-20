import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('light');

  const toggleTheme = () => {
    let themeSelected = theme === 'light' ? 'dark' : 'light';
    sessionStorage.setItem('theme', themeSelected);
    setTheme(themeSelected);
  };

  useEffect(() => {
    const storedTheme = sessionStorage.getItem('theme');
    if (storedTheme) {
      setTheme(storedTheme);
      document.body.classList.toggle('dark', storedTheme === 'dark');
    } else {
      document.body.classList.toggle('dark', theme === 'dark');
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <div
        className={`min-h-screen ${theme === 'dark' ? 'theme-dark' : ''}`}
        style={{
          backgroundColor: 'var(--bg-color)',
          color: 'var(--text-color)',
        }}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
