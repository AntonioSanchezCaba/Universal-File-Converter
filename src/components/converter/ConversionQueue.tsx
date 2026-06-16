import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useConversion } from '../../contexts/ConversionContext';
import { List, Trash2, Download, RotateCw } from 'lucide-react';
import FilePreview from './FilePreview';

const ConversionQueue: React.FC = () => {
  const { theme } = useTheme();
  const { filteredFiles, removeFile, conversions } = useConversion();

  const calculateFileSize = (size: number): string => {
    if (size < 1024) {
      return `${size} bytes`;
    } else if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    } else {
      return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    }
  };

  return (
    <div className={`rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-sm p-6`}>
      <div className="flex items-center mb-4">
        <List size={20} className="mr-2 text-blue-500" />
        <h3 className="text-lg font-medium">Files Queue</h3>
      </div>

      {filteredFiles.length === 0 ? (
        <div className={`text-center py-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
          <p>No files added yet.</p>
          <p className="text-sm mt-2">Add files to start converting!</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
          {filteredFiles.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className={`p-3 rounded-md ${
                theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'
              } transition-colors duration-150`}
            >
              <div className="flex items-start">
                <FilePreview file={file} />
                <div className="flex-1 min-w-0 ml-3">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {calculateFileSize(file.size)}
                  </p>
                  
                  {conversions[index] && (
                    <div className="mt-1">
                      {conversions[index].status === 'processing' && (
                        <div className="flex items-center">
                          <RotateCw size={14} className="text-blue-500 animate-spin mr-1" />
                          <span className="text-xs text-blue-500">Converting... {conversions[index].progress}%</span>
                        </div>
                      )}
                      {conversions[index].status === 'completed' && (
                        <div className="flex items-center">
                          <Download size={14} className="text-green-500 mr-1" />
                          <a 
                            href={conversions[index].result} 
                            download={`${file.name.split('.')[0]}.${conversions[index].format}`}
                            className="text-xs text-green-500 hover:underline"
                          >
                            Download
                          </a>
                        </div>
                      )}
                      {conversions[index].status === 'error' && (
                        <div className="flex items-center">
                          <span className="text-xs text-red-500">Error: {conversions[index].error}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className={`p-1 rounded-full ${
                    theme === 'dark' ? 'hover:bg-gray-600' : 'hover:bg-gray-200'
                  } focus:outline-none`}
                  aria-label="Remove file"
                >
                  <Trash2 size={16} className="text-red-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredFiles.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => console.log('Clearing all files')}
            className={`text-sm px-3 py-1 rounded-md ${
              theme === 'dark'
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            } focus:outline-none transition-colors duration-150`}
          >
            Clear All
          </button>
        </div>
      )}
    </div>
  );
};

export default ConversionQueue;