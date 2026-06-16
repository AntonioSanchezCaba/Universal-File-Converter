import React from 'react';
import * as LucideIcons from 'lucide-react';

// Helper to get the appropriate icon for a file type
export const getFileTypeIcon = (mimeType: string): React.ReactNode => {
  if (mimeType.startsWith('image/')) {
    return React.createElement(LucideIcons.FileImage, { className: "text-blue-500" });
  } else if (mimeType.startsWith('text/') || 
             mimeType.includes('pdf') || 
             mimeType.includes('document')) {
    return React.createElement(LucideIcons.FileText, { className: "text-orange-500" });
  } else if (mimeType.includes('sheet') || 
             mimeType.includes('csv') || 
             mimeType.includes('excel')) {
    return React.createElement(LucideIcons.FileSpreadsheet, { className: "text-green-500" });
  } else if (mimeType.includes('zip') || 
             mimeType.includes('compressed') || 
             mimeType.includes('archive')) {
    return React.createElement(LucideIcons.Archive, { className: "text-purple-500" });
  } else if (mimeType.startsWith('audio/')) {
    return React.createElement(LucideIcons.FileAudio, { className: "text-red-500" });
  } else if (mimeType.startsWith('video/')) {
    return React.createElement(LucideIcons.FileVideo, { className: "text-pink-500" });
  } else {
    return React.createElement(LucideIcons.File, { className: "text-gray-500" });
  }
};

// Generate a unique filename to avoid overwriting
export const generateUniqueFilename = (filename: string, extension: string): string => {
  const baseName = filename.split('.')[0];
  const timestamp = new Date().getTime();
  return `${baseName}_converted_${timestamp}.${extension}`;
};

// Read a file as ArrayBuffer (useful for binary operations)
export const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as ArrayBuffer'));
      }
    };
    reader.onerror = () => {
      reject(reader.error);
    };
    reader.readAsArrayBuffer(file);
  });
};

// Read a file as Data URL (useful for previews)
export const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as Data URL'));
      }
    };
    reader.onerror = () => {
      reject(reader.error);
    };
    reader.readAsDataURL(file);
  });
};