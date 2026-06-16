import React, { useState, useEffect } from 'react';
import { FileIcon, FileText, FileImage, FileSpreadsheet, Film, Music, Archive, File } from 'lucide-react';
import { getFileTypeIcon } from '../../utils/fileUtils';

interface FilePreviewProps {
  file: File;
  size?: number;
}

const FilePreview: React.FC<FilePreviewProps> = ({ file, size = 40 }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const icon = getFileTypeIcon(file.type);

  useEffect(() => {
    // Only generate previews for image files
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setPreviewUrl(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }

    return () => {
      // Clean up preview URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [file]);

  if (previewUrl && file.type.startsWith('image/')) {
    return (
      <div 
        className="flex-shrink-0 rounded overflow-hidden"
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        <img
          src={previewUrl}
          alt={file.name}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div 
      className="flex-shrink-0 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded"
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      {React.cloneElement(icon, { size: size * 0.5 })}
    </div>
  );
};

export default FilePreview;