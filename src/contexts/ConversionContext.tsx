import React, { createContext, useContext, useState, useCallback } from 'react';
import { ConversionSettings, ConversionStatus, FormatCategory } from '../types/converter';
import { getFormatFromMimeType } from '../utils/formatUtils';
import { convertImage } from '../utils/imageConverter';
import { convertDocument } from '../utils/documentConverter';

interface ConversionContextType {
  files: File[];
  addFiles: (newFiles: File[]) => void;
  removeFile: (index: number) => void;
  clearFiles: () => void;
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
  if (!context) throw new Error('useConversion must be used within a ConversionProvider');
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
      method: 'simple',
      threshold: 128,
      background: '#ffffff',
      foreground: '#000000',
      steps: 4,
    },
  });

  const addFiles = useCallback((newFiles: File[]) => {
    setFiles(prev => [...prev, ...newFiles]);
    setConversions(prev => [
      ...prev,
      ...newFiles.map(() => ({ status: 'idle' as const, progress: 0, format: '', result: null, error: null })),
    ]);
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setConversions(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearFiles = useCallback(() => {
    setFiles([]);
    setConversions([]);
  }, []);

  const updateConversionSettings = useCallback((settings: ConversionSettings) => {
    setConversionSettings(settings);
  }, []);

  const filteredFiles = files.filter(file => {
    if (!selectedCategory) return true;
    const format = getFormatFromMimeType(file.type);
    return format?.category === selectedCategory;
  });

  const convertFile = async (file: File, format: string, quality: number): Promise<Blob> => {
    if (file.type.startsWith('image/')) {
      return convertImage(file, format, quality);
    }
    if (
      file.type === 'application/pdf' ||
      file.type === 'text/plain' ||
      file.type === 'text/html' ||
      file.type === 'text/markdown' ||
      file.name.endsWith('.md') ||
      file.name.endsWith('.txt')
    ) {
      return convertDocument(file, format);
    }
    throw new Error(`Conversion from "${file.type}" to "${format}" is not yet supported`);
  };

  const startConversion = useCallback(async () => {
    if (filteredFiles.length === 0 || !selectedFormat) return;

    // Snapshot current state to avoid stale closure issues
    const currentFiles = files;
    const quality = conversionSettings.quality;

    setConversions(prev => {
      const next = [...prev];
      filteredFiles.forEach(file => {
        const idx = currentFiles.indexOf(file);
        if (idx !== -1) {
          next[idx] = { ...next[idx], status: 'processing', progress: 0, format: selectedFormat, error: null };
        }
      });
      return next;
    });

    for (const file of filteredFiles) {
      const fileIndex = currentFiles.indexOf(file);
      if (fileIndex === -1) continue;

      setConversions(prev => {
        const next = [...prev];
        next[fileIndex] = { ...next[fileIndex], progress: 20 };
        return next;
      });

      try {
        const blob = await convertFile(file, selectedFormat, quality);

        setConversions(prev => {
          const next = [...prev];
          next[fileIndex] = { ...next[fileIndex], progress: 80 };
          return next;
        });

        const resultUrl = URL.createObjectURL(blob);

        setConversions(prev => {
          const next = [...prev];
          next[fileIndex] = { status: 'completed', progress: 100, format: selectedFormat, result: resultUrl, error: null };
          return next;
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setConversions(prev => {
          const next = [...prev];
          next[fileIndex] = { status: 'error', progress: 0, format: selectedFormat, result: null, error: message };
          return next;
        });
      }
    }
  }, [filteredFiles, files, selectedFormat, conversionSettings.quality]);

  return (
    <ConversionContext.Provider
      value={{
        files,
        addFiles,
        removeFile,
        clearFiles,
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
