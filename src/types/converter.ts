export type FormatCategory = 'image' | 'document' | 'spreadsheet' | 'archive' | 'audio' | 'video' | 'other';

export interface FormatOption {
  extension: string;
  name: string;
  category: FormatCategory;
  mimeType: string;
}

export interface ResizeOptions {
  width: number | null;
  height: number | null;
  maintainAspectRatio: boolean;
}

export interface SVGOptions {
  method: 'simple' | 'trace' | 'advanced';
  threshold: number;
  background: string;
  foreground: string;
  steps: number;
}

export interface ConversionSettings {
  quality: number;
  preserveMetadata: boolean;
  compression?: 'none' | 'low' | 'medium' | 'high';
  resizeOptions: ResizeOptions | null;
  svgOptions: SVGOptions;
}

export interface ConversionStatus {
  status: 'idle' | 'processing' | 'completed' | 'error';
  progress: number;
  format: string;
  result: string | null;
  error: string | null;
}

export interface ConversionResult {
  originalFile: File;
  convertedBlob: Blob;
  format: string;
  downloadUrl: string;
}