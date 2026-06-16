import React, { useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useConversion } from '../../contexts/ConversionContext';
import { X, Image, FileText, FileSpreadsheet, FileBox, Archive, FileAudio, FileVideo } from 'lucide-react';
import { FormatCategory } from '../../types/converter';

interface SidebarProps {
  isOpen: boolean;
  closeSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, closeSidebar }) => {
  const { theme } = useTheme();
  const { selectedCategory, setSelectedCategory } = useConversion();

  // Close sidebar on mobile when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const sidebar = document.getElementById('sidebar');
      const hamburger = document.getElementById('hamburger-button');
      
      if (isOpen && sidebar && !sidebar.contains(event.target as Node) && 
          hamburger && !hamburger.contains(event.target as Node)) {
        closeSidebar();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, closeSidebar]);

  const categories: {
    name: string;
    icon: React.ReactNode;
    type: FormatCategory;
    description: string;
    formats: string[];
  }[] = [
    {
      name: 'Images',
      icon: <Image size={18} />,
      type: 'image',
      description: 'Convert between common image formats',
      formats: ['JPG', 'PNG', 'WebP', 'GIF', 'SVG', 'BMP']
    },
    {
      name: 'Documents',
      icon: <FileText size={18} />,
      type: 'document',
      description: 'Convert text and document files',
      formats: ['PDF', 'TXT', 'HTML', 'MD']
    },
    {
      name: 'Spreadsheets',
      icon: <FileSpreadsheet size={18} />,
      type: 'spreadsheet',
      description: 'Convert data and spreadsheet files',
      formats: ['CSV', 'JSON', 'XML']
    },
    {
      name: 'Archives',
      icon: <Archive size={18} />,
      type: 'archive',
      description: 'Convert between archive formats',
      formats: ['ZIP', 'TAR', '7Z']
    },
    {
      name: 'Audio',
      icon: <FileAudio size={18} />,
      type: 'audio',
      description: 'Convert audio files',
      formats: ['MP3', 'WAV', 'OGG']
    },
    {
      name: 'Video',
      icon: <FileVideo size={18} />,
      type: 'video',
      description: 'Convert video files',
      formats: ['MP4', 'WebM', 'AVI']
    },
    {
      name: 'Other Formats',
      icon: <FileBox size={18} />,
      type: 'other',
      description: 'Convert other file types',
      formats: []
    }
  ];

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          aria-hidden="true"
        />
      )}
      
      {/* Sidebar */}
      <aside
        id="sidebar"
        className={`fixed md:relative inset-y-0 left-0 z-40 w-72 transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 transition-transform duration-300 ease-in-out ${
          theme === 'dark' ? 'bg-gray-800' : 'bg-white'
        } shadow-lg md:shadow-none`}
      >
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold">Format Categories</h2>
            <button
              onClick={closeSidebar}
              className={`p-2 rounded-md md:hidden ${
                theme === 'dark' ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-100 text-gray-600'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              aria-label="Close sidebar"
            >
              <X size={18} />
            </button>
          </div>
          
          <nav className="flex-1 px-2 py-4 overflow-y-auto">
            <ul className="space-y-2">
              {categories.map((category) => (
                <li key={category.name}>
                  <button
                    onClick={() => {
                      setSelectedCategory(selectedCategory === category.type ? null : category.type);
                      if (window.innerWidth < 768) {
                        closeSidebar();
                      }
                    }}
                    className={`w-full text-left p-3 rounded-lg transition-all duration-150 ${
                      selectedCategory === category.type
                        ? theme === 'dark'
                          ? 'bg-blue-600 text-white'
                          : 'bg-blue-100 text-blue-800'
                        : theme === 'dark'
                        ? 'hover:bg-gray-700 text-gray-200'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center">
                      <span className="mr-3">{category.icon}</span>
                      <span className="font-medium">{category.name}</span>
                    </div>
                    <div className={`mt-1 text-sm ${
                      selectedCategory === category.type
                        ? theme === 'dark'
                          ? 'text-gray-200'
                          : 'text-blue-600'
                        : theme === 'dark'
                        ? 'text-gray-400'
                        : 'text-gray-500'
                    }`}>
                      {category.description}
                    </div>
                    {category.formats.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {category.formats.map((format) => (
                          <span
                            key={format}
                            className={`text-xs px-1.5 py-0.5 rounded ${
                              selectedCategory === category.type
                                ? theme === 'dark'
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-blue-200 text-blue-800'
                                : theme === 'dark'
                                ? 'bg-gray-700 text-gray-300'
                                : 'bg-gray-200 text-gray-700'
                            }`}
                          >
                            {format}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              All conversions are processed locally in your browser for complete privacy.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;