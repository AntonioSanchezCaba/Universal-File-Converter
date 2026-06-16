import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import FileUploader from '../converter/FileUploader';
import ConversionOptions from '../converter/ConversionOptions';
import ConversionQueue from '../converter/ConversionQueue';

const MainContent: React.FC = () => {
  const { theme } = useTheme();

  return (
    <main className={`flex-1 p-4 md:p-6 overflow-auto ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="container mx-auto">
        <h2 className={`text-2xl font-semibold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
          Convert Your Files
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">
            <FileUploader />
            <ConversionOptions />
          </div>
          
          {/* Right column */}
          <div className="lg:col-span-1 space-y-6">
            <ConversionQueue />
          </div>
        </div>
      </div>
    </main>
  );
};

export default MainContent;