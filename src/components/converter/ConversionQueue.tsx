import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useConversion } from '../../contexts/ConversionContext';
import { List, Trash2, Download, RotateCw, AlertCircle } from 'lucide-react';
import FilePreview from './FilePreview';

const formatSize = (size: number): string => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const ConversionQueue: React.FC = () => {
  const { theme } = useTheme();
  const { files, filteredFiles, removeFile, clearFiles, conversions } = useConversion();

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
          {filteredFiles.map((file) => {
            // Use the file's position in the master list for conversion status lookup
            const fileIndex = files.indexOf(file);
            const conversion = conversions[fileIndex];

            return (
              <div
                key={`${file.name}-${fileIndex}`}
                className={`p-3 rounded-md ${
                  theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'
                } transition-colors duration-150`}
              >
                <div className="flex items-start">
                  <FilePreview file={file} />
                  <div className="flex-1 min-w-0 ml-3">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      {formatSize(file.size)}
                    </p>

                    {conversion && (
                      <div className="mt-1">
                        {conversion.status === 'processing' && (
                          <div className="flex items-center gap-1">
                            <RotateCw size={13} className="text-blue-500 animate-spin" />
                            <span className="text-xs text-blue-500">
                              Converting… {conversion.progress}%
                            </span>
                          </div>
                        )}
                        {conversion.status === 'completed' && conversion.result && (
                          <div className="flex items-center gap-1">
                            <Download size={13} className="text-green-500" />
                            <a
                              href={conversion.result}
                              download={`${file.name.replace(/\.[^.]+$/, '')}.${conversion.format}`}
                              className="text-xs text-green-500 hover:underline"
                            >
                              Download .{conversion.format}
                            </a>
                          </div>
                        )}
                        {conversion.status === 'error' && (
                          <div className="flex items-start gap-1 mt-1">
                            <AlertCircle size={13} className="text-red-500 shrink-0 mt-px" />
                            <span className="text-xs text-red-500">{conversion.error}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => removeFile(fileIndex)}
                    className={`p-1 rounded-full shrink-0 ml-2 ${
                      theme === 'dark' ? 'hover:bg-gray-600' : 'hover:bg-gray-200'
                    } focus:outline-none`}
                    aria-label="Remove file"
                  >
                    <Trash2 size={15} className="text-red-500" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filteredFiles.length > 0 && (
        <div className="mt-4">
          <button
            onClick={clearFiles}
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
