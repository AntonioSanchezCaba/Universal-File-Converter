import { FormatOption, FormatCategory } from '../types/converter';

// Format definitions for common file types
export const formatDefinitions: FormatOption[] = [
  // Image Formats
  { extension: 'jpg', name: 'JPEG Image', category: 'image', mimeType: 'image/jpeg' },
  { extension: 'png', name: 'PNG Image', category: 'image', mimeType: 'image/png' },
  { extension: 'webp', name: 'WebP Image', category: 'image', mimeType: 'image/webp' },
  { extension: 'gif', name: 'GIF Image', category: 'image', mimeType: 'image/gif' },
  { extension: 'svg', name: 'SVG Image', category: 'image', mimeType: 'image/svg+xml' },
  { extension: 'bmp', name: 'Bitmap Image', category: 'image', mimeType: 'image/bmp' },
  { extension: 'ico', name: 'Icon Image', category: 'image', mimeType: 'image/x-icon' },
  
  // Document Formats
  { extension: 'pdf', name: 'PDF Document', category: 'document', mimeType: 'application/pdf' },
  { extension: 'docx', name: 'Word Document', category: 'document', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  { extension: 'txt', name: 'Text Document', category: 'document', mimeType: 'text/plain' },
  { extension: 'html', name: 'HTML Document', category: 'document', mimeType: 'text/html' },
  { extension: 'md', name: 'Markdown Document', category: 'document', mimeType: 'text/markdown' },
  
  // Spreadsheet Formats
  { extension: 'csv', name: 'CSV Spreadsheet', category: 'spreadsheet', mimeType: 'text/csv' },
  { extension: 'json', name: 'JSON Data', category: 'spreadsheet', mimeType: 'application/json' },
  { extension: 'xml', name: 'XML Data', category: 'spreadsheet', mimeType: 'application/xml' },
  
  // Archive Formats
  { extension: 'zip', name: 'ZIP Archive', category: 'archive', mimeType: 'application/zip' },
  { extension: 'tar', name: 'TAR Archive', category: 'archive', mimeType: 'application/x-tar' },
  { extension: '7z', name: '7-Zip Archive', category: 'archive', mimeType: 'application/x-7z-compressed' },
  
  // Audio Formats
  { extension: 'mp3', name: 'MP3 Audio', category: 'audio', mimeType: 'audio/mpeg' },
  { extension: 'wav', name: 'WAV Audio', category: 'audio', mimeType: 'audio/wav' },
  { extension: 'ogg', name: 'OGG Audio', category: 'audio', mimeType: 'audio/ogg' },
  
  // Video Formats
  { extension: 'mp4', name: 'MP4 Video', category: 'video', mimeType: 'video/mp4' },
  { extension: 'webm', name: 'WebM Video', category: 'video', mimeType: 'video/webm' },
  { extension: 'avi', name: 'AVI Video', category: 'video', mimeType: 'video/x-msvideo' },
];

// Helper to get the file extension from a filename
export const getFileExtension = (filename: string): string => {
  return filename.split('.').pop()?.toLowerCase() || '';
};

// Helper to get MIME type from file extension
export const getMimeTypeFromExtension = (extension: string): string | null => {
  const format = formatDefinitions.find(f => f.extension === extension.toLowerCase());
  return format ? format.mimeType : null;
};

// Helper to get format definition from MIME type
export const getFormatFromMimeType = (mimeType: string): FormatOption | null => {
  return formatDefinitions.find(f => f.mimeType === mimeType) || null;
};

// Helper to get available output formats based on category
export const getOutputFormats = (category: FormatCategory): FormatOption[] => {
  return formatDefinitions.filter(f => f.category === category);
};

// Helper to check if a conversion is possible between two formats
export const isConversionPossible = (inputFormat: string, outputFormat: string): boolean => {
  const input = formatDefinitions.find(f => f.extension === inputFormat.toLowerCase());
  const output = formatDefinitions.find(f => f.extension === outputFormat.toLowerCase());
  
  if (!input || !output) {
    return false;
  }
  
  return input.category === output.category;
};