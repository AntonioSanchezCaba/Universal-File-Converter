import React, { createContext, useContext, useState, useCallback } from 'react';
import { ConversionSettings, ConversionStatus, FormatCategory } from '../types/converter';
import { getFormatFromMimeType } from '../utils/formatUtils';
import imageCompression from 'browser-image-compression';
import * as LucideIcons from 'lucide-react';

// Define helper functions for file conversion
const fileToDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert file to Data URL'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
};

const fileToArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as ArrayBuffer'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
};

const getImageDimensions = (dataUrl: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = () => reject(new Error('Failed to load image for dimension calculation'));
    img.src = dataUrl;
  });
};

interface ConversionContextType {
  files: File[];
  addFiles: (newFiles: File[]) => void;
  removeFile: (index: number) => void;
  selectedFormat: string;
  setSelectedFormat: (format: string) => void;
  conversionSettings: ConversionSettings;
  updateConversionSettings: (settings: ConversionSettings) => void;
  conversions: ConversionStatus[];
  startConversion: () => void;
  selectedCategory: FormatCategory | null;
  setSelectedCategory: (category: FormatCategory | null) => void;
  filteredFiles: File[];
}

const ConversionContext = createContext<ConversionContextType | undefined>(undefined);

export const useConversion = (): ConversionContextType => {
  const context = useContext(ConversionContext);
  if (!context) {
    throw new Error('useConversion must be used within a ConversionProvider');
  }
  return context;
};

export const ConversionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [selectedFormat, setSelectedFormat] = useState<string>('');
  const [conversions, setConversions] = useState<ConversionStatus[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<FormatCategory | null>(null);
  const [conversionSettings, setConversionSettings] = useState<ConversionSettings>({
    quality: 80,
    preserveMetadata: true,
    compression: 'medium',
    resizeOptions: null,
    svgOptions: {
      method: 'simple', // 'simple', 'trace', or 'advanced'
      threshold: 128, // for tracing (0-255)
      background: '#ffffff', // background color for SVG
      foreground: '#000000', // foreground color for SVG
      steps: 4, // quantization steps for advanced tracing
    }
  });

  const addFiles = useCallback((newFiles: File[]) => {
    setFiles((prevFiles) => [...prevFiles, ...newFiles]);
    setConversions((prevConversions) => [
      ...prevConversions,
      ...newFiles.map(() => ({
        status: 'idle',
        progress: 0,
        format: '',
        result: null,
        error: null
      }))
    ]);
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
    setConversions((prevConversions) => prevConversions.filter((_, i) => i !== index));
  }, []);

  const updateConversionSettings = useCallback((settings: ConversionSettings) => {
    setConversionSettings(settings);
  }, []);

  const filteredFiles = files.filter(file => {
    if (!selectedCategory) return true;
    const format = getFormatFromMimeType(file.type);
    return format?.category === selectedCategory;
  });

  // Image conversion functions
  const convertImageToWebp = async (file: File, quality: number): Promise<Blob> => {
    const options = {
      maxSizeMB: 2,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      fileType: 'image/webp',
      initialQuality: quality / 100,
    };

    try {
      return await imageCompression(file, options);
    } catch (error) {
      throw new Error(`WebP conversion failed: ${error.message}`);
    }
  };

  const convertImageToPng = async (file: File): Promise<Blob> => {
    const options = {
      maxSizeMB: 5,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      fileType: 'image/png',
    };

    try {
      return await imageCompression(file, options);
    } catch (error) {
      throw new Error(`PNG conversion failed: ${error.message}`);
    }
  };

  const convertImageToJpeg = async (file: File, quality: number): Promise<Blob> => {
    const options = {
      maxSizeMB: 2,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      fileType: 'image/jpeg',
      initialQuality: quality / 100,
    };

    try {
      return await imageCompression(file, options);
    } catch (error) {
      throw new Error(`JPEG conversion failed: ${error.message}`);
    }
  };

  // Approach 1: Simple SVG conversion (embedding the raster image in SVG)
  const convertToSimpleSVG = async (file: File): Promise<Blob> => {
    try {
      // Get the image data as DataURL
      const dataUrl = await fileToDataURL(file);
      
      // Get image dimensions
      const dimensions = await getImageDimensions(dataUrl);
      
      // Create a clean SVG that properly embeds the image
      const svgContent = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
     width="${dimensions.width}" height="${dimensions.height}" 
     viewBox="0 0 ${dimensions.width} ${dimensions.height}">
  <title>Converted from ${file.name.replace(/[<>&'"]/g, '')}</title>
  <image width="100%" height="100%" xlink:href="${dataUrl}" />
</svg>`;
      
      return new Blob([svgContent], { type: 'image/svg+xml' });
    } catch (error) {
      throw new Error(`Simple SVG conversion failed: ${error.message}`);
    }
  };

  // Approach 2: Basic tracing SVG conversion (simplified client-side tracing)
  // Note: This is a simplified version - for actual use, install a proper tracing library
  const convertToTracedSVG = async (file: File): Promise<Blob> => {
    try {
      // Get the image data
      const dataUrl = await fileToDataURL(file);
      const dimensions = await getImageDimensions(dataUrl);
      
      // Create a canvas to process the image for tracing
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not create canvas context for SVG tracing');
      }
      
      // Set canvas size to image dimensions
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;
      
      // Draw the image to canvas
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = dataUrl;
      });
      ctx.drawImage(img, 0, 0);
      
      // Get image data for processing
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const { data, width, height } = imageData;
      
      // Simple edge detection (for illustration - not a full tracing solution)
      // In a real app, use a library like potrace.js
      const threshold = conversionSettings.svgOptions?.threshold || 128;
      const paths = [];
      
      // Very simplified approach: detect edges by comparing adjacent pixels
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = (y * width + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          
          // Convert to grayscale and check against threshold
          const gray = 0.3 * r + 0.59 * g + 0.11 * b;
          
          // Check neighbors
          const idxLeft = (y * width + (x - 1)) * 4;
          const idxRight = (y * width + (x + 1)) * 4;
          const idxUp = ((y - 1) * width + x) * 4;
          const idxDown = ((y + 1) * width + x) * 4;
          
          const grayLeft = 0.3 * data[idxLeft] + 0.59 * data[idxLeft + 1] + 0.11 * data[idxLeft + 2];
          const grayRight = 0.3 * data[idxRight] + 0.59 * data[idxRight + 1] + 0.11 * data[idxRight + 2];
          const grayUp = 0.3 * data[idxUp] + 0.59 * data[idxUp + 1] + 0.11 * data[idxUp + 2];
          const grayDown = 0.3 * data[idxDown] + 0.59 * data[idxDown + 1] + 0.11 * data[idxDown + 2];
          
          // Simple edge detection
          if (
            Math.abs(gray - grayLeft) > threshold ||
            Math.abs(gray - grayRight) > threshold ||
            Math.abs(gray - grayUp) > threshold ||
            Math.abs(gray - grayDown) > threshold
          ) {
            paths.push(`M${x},${y}L${x + 1},${y}`);
          }
        }
      }
      
      // Create a simple SVG with the path data
      const svgContent = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <title>Traced from ${file.name.replace(/[<>&'"]/g, '')}</title>
  <rect width="${width}" height="${height}" fill="${conversionSettings.svgOptions?.background || '#ffffff'}" />
  <path d="${paths.join(' ')}" stroke="${conversionSettings.svgOptions?.foreground || '#000000'}" stroke-width="1" fill="none" />
</svg>`;
      
      return new Blob([svgContent], { type: 'image/svg+xml' });
    } catch (error) {
      throw new Error(`SVG tracing failed: ${error.message}`);
    }
  };

  // Main SVG conversion function that selects the appropriate method
  const convertToSVG = async (file: File): Promise<Blob> => {
    const method = conversionSettings.svgOptions?.method || 'simple';
    
    switch (method) {
      case 'simple':
        return convertToSimpleSVG(file);
      case 'trace':
        return convertToTracedSVG(file);
      case 'advanced':
        // For advanced tracing, you would typically use a server-side solution
        // or integrate with a more robust client-side library
        throw new Error('Advanced SVG tracing requires server-side processing or additional libraries');
      default:
        return convertToSimpleSVG(file);
    }
  };

  // Document conversion functions
  const convertDocToPdf = async (file: File): Promise<Blob> => {
    // Placeholder for actual conversion logic
    // In a real app, you'd use mammoth.js, pdf-lib or similar
    throw new Error('DOC to PDF conversion not implemented - requires server-side processing');
  };

  const convertPdfToDocx = async (file: File): Promise<Blob> => {
    // Placeholder for actual conversion logic
    throw new Error('PDF to DOCX conversion not implemented - requires server-side processing');
  };

  // Audio conversion functions
  const convertAudioFormat = async (file: File, format: string): Promise<Blob> => {
    // Placeholder for audio conversion using Web Audio API or ffmpeg.wasm
    throw new Error(`Audio conversion to ${format} not implemented - requires ffmpeg.wasm or similar`);
  };

  // Video conversion functions
  const convertVideoFormat = async (file: File, format: string): Promise<Blob> => {
    // Placeholder for video conversion using ffmpeg.wasm
    throw new Error(`Video conversion to ${format} not implemented - requires ffmpeg.wasm or similar`);
  };

  // Primary conversion function that routes to specific converters
  const convertFile = async (file: File, format: string): Promise<Blob> => {
    // Extract file type category
    const sourceType = file.type.split('/')[0];
    
    // Handle image conversions
    if (sourceType === 'image' || file.type.startsWith('image/')) {
      switch (format) {
        case 'webp':
          return convertImageToWebp(file, conversionSettings.quality);
        case 'png':
          return convertImageToPng(file);
        case 'jpeg':
        case 'jpg':
          return convertImageToJpeg(file, conversionSettings.quality);
        case 'svg':
          return convertToSVG(file);
        default:
          throw new Error(`Unsupported image conversion format: ${format}`);
      }
    }
    
    // Handle document conversions
    if (sourceType === 'application' || file.type.includes('document') || file.type.includes('pdf')) {
      switch (format) {
        case 'pdf':
          return convertDocToPdf(file);
        case 'docx':
          return convertPdfToDocx(file);
        default:
          throw new Error(`Unsupported document conversion format: ${format}`);
      }
    }
    
    // Handle audio conversions
    if (sourceType === 'audio' || file.type.startsWith('audio/')) {
      return convertAudioFormat(file, format);
    }
    
    // Handle video conversions
    if (sourceType === 'video' || file.type.startsWith('video/')) {
      return convertVideoFormat(file, format);
    }
    
    throw new Error(`Unsupported conversion: ${file.type} to ${format}`);
  };

  const startConversion = useCallback(async () => {
    if (filteredFiles.length === 0 || !selectedFormat) return;

    // Update all conversions to processing state
    setConversions((prevConversions) => {
      const updatedConversions = [...prevConversions];
      filteredFiles.forEach(file => {
        const fileIndex = files.indexOf(file);
        if (fileIndex !== -1) {
          updatedConversions[fileIndex] = {
            ...updatedConversions[fileIndex],
            status: 'processing',
            progress: 0,
            format: selectedFormat,
            error: null
          };
        }
      });
      return updatedConversions;
    });

    // Process each file
    for (const file of filteredFiles) {
      const fileIndex = files.indexOf(file);
      if (fileIndex === -1) continue;
      
      try {
        // Update progress
        setConversions((prevConversions) => {
          const newConversions = [...prevConversions];
          newConversions[fileIndex] = {
            ...newConversions[fileIndex],
            progress: 20
          };
          return newConversions;
        });
        
        // Convert the file
        const convertedBlob = await convertFile(file, selectedFormat);
        
        // Update progress
        setConversions((prevConversions) => {
          const newConversions = [...prevConversions];
          newConversions[fileIndex] = {
            ...newConversions[fileIndex],
            progress: 80
          };
          return newConversions;
        });
        
        // Create object URL for the result
        const resultUrl = URL.createObjectURL(convertedBlob);
        
        // Update conversion status to completed
        setConversions((prevConversions) => {
          const newConversions = [...prevConversions];
          newConversions[fileIndex] = {
            ...newConversions[fileIndex],
            status: 'completed',
            progress: 100,
            result: resultUrl,
            error: null
          };
          return newConversions;
        });
      } catch (error) {
        // Update conversion status to error
        setConversions((prevConversions) => {
          const newConversions = [...prevConversions];
          newConversions[fileIndex] = {
            ...newConversions[fileIndex],
            status: 'error',
            progress: 0,
            result: null,
            error: error.message
          };
          return newConversions;
        });
      }
    }
  }, [filteredFiles, files, selectedFormat, conversionSettings]);

  return (
    <ConversionContext.Provider
      value={{
        files,
        addFiles,
        removeFile,
        selectedFormat,
        setSelectedFormat,
        conversionSettings,
        updateConversionSettings,
        conversions,
        startConversion,
        selectedCategory,
        setSelectedCategory,
        filteredFiles,
      }}
    >
      {children}
    </ConversionContext.Provider>
  );
};