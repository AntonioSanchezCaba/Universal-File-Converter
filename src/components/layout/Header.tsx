import React from 'react';
import { Menu, Moon, Sun, FileText } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface HeaderProps {
  toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className={`sticky top-0 z-50 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-md`}>
      <div className="container mx-auto">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-2">
            <button 
              onClick={toggleSidebar}
              className={`md:hidden p-2 rounded-md transition-colors duration-150 ${
                theme === 'dark' 
                  ? 'hover:bg-gray-700 text-gray-200' 
                  : 'hover:bg-gray-100 text-gray-600'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              aria-label="Toggle sidebar"
            >
              <Menu size={24} />
            </button>
            <div className="flex items-center">
              <FileText className="text-blue-500 h-7 w-7" />
              <h1 className="ml-2 text-xl font-semibold tracking-tight">
                Universal File Converter
              </h1>
            </div>
          </div>
          <div className="flex items-center ml-auto">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-md transition-colors duration-150 ${
                theme === 'dark' 
                  ? 'hover:bg-gray-700 text-gray-200' 
                  : 'hover:bg-gray-100 text-gray-600'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <Sun className="text-yellow-300" size={20} />
              ) : (
                <Moon className="text-gray-600" size={20} />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;