import React, { useState, useRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useConversion } from '../../contexts/ConversionContext';
import { Upload, File, X } from 'lucide-react';

const FileUploader: React.FC = () => {
  const { theme } = useTheme();
  const { addFiles } = useConversion();
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files));
    }
  };

  const handleClickUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      className={`rounded-lg ${
        theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      } border-2 ${
        isDragging ? 'border-blue-500 border-dashed' : ''
      } shadow-sm transition-all duration-200 p-6`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="flex flex-col items-center justify-center py-6">
        <div className={`mb-4 p-3 rounded-full ${theme === 'dark' ? 'bg-gray-700' : 'bg-blue-50'}`}>
          <Upload size={32} className="text-blue-500" />
        </div>
        <h3 className="mb-2 text-xl font-medium">Upload Your Files</h3>
        <p className={`mb-4 text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
          Drag and drop files here, or click to select files
        </p>
        <button
          onClick={handleClickUpload}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-colors duration-200"
        >
          Select Files
        </button>
        <input
          type="file"
          multiple
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileInputChange}
        />
        <p className="mt-4 text-sm text-center text-gray-500">
          Maximum file size: 100MB. All processing is done locally.
        </p>
      </div>
    </div>
  );
};

export default FileUploader;