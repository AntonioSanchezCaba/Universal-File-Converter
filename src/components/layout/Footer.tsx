import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Github, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  const { theme } = useTheme();
  const year = new Date().getFullYear();

  return (
    <footer className={`py-4 px-6 ${theme === 'dark' ? 'bg-gray-800 text-gray-300' : 'bg-white text-gray-600'} shadow-inner`}>
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <p className="text-sm">
              © {year} Universal File Converter by AMSC. All files are processed locally in your browser.
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              to="/privacy"
              className={`text-sm ${theme === 'dark' ? 'hover:text-white' : 'hover:text-gray-900'} transition-colors duration-150`}
            >
              Privacy Policy
            </Link>
            <Link
              to="/terms"
              className={`text-sm ${theme === 'dark' ? 'hover:text-white' : 'hover:text-gray-900'} transition-colors duration-150`}
            >
              Terms of Service
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center ${theme === 'dark' ? 'hover:text-white' : 'hover:text-gray-900'} transition-colors duration-150`}
            >
              <Github size={16} className="mr-1" />
              <span className="text-sm">GitHub</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;