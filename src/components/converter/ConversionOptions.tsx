import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useConversion } from '../../contexts/ConversionContext';
import { Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { getOutputFormats } from '../../utils/formatUtils';

const ConversionOptions: React.FC = () => {
  const { theme } = useTheme();
  const { 
    filteredFiles, 
    selectedFormat, 
    setSelectedFormat, 
    conversionSettings, 
    updateConversionSettings,
    selectedCategory,
    startConversion
  } = useConversion();
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Get available output formats based on selected category
  const outputFormats = selectedCategory 
    ? getOutputFormats(selectedCategory)
    : [];

  // Reset selected format when category changes
  useEffect(() => {
    setSelectedFormat('');
  }, [selectedCategory, setSelectedFormat]);

  const handleFormatChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedFormat(e.target.value);
  };

  const handleQualityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateConversionSettings({
      ...conversionSettings,
      quality: parseInt(e.target.value, 10)
    });
  };

  const handleStartConversion = () => {
    if (filteredFiles.length > 0 && selectedFormat) {
      startConversion();
    }
  };

  return (
    <div className={`rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-sm p-6`}>
      <div className="flex items-center mb-4">
        <Settings size={20} className="mr-2 text-blue-500" />
        <h3 className="text-lg font-medium">Conversion Options</h3>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="outputFormat" className={`block mb-2 text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            Output Format
          </label>
          <select
            id="outputFormat"
            value={selectedFormat}
            onChange={handleFormatChange}
            disabled={!selectedCategory || filteredFiles.length === 0}
            className={`w-full px-3 py-2 rounded-md border ${
              theme === 'dark' 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-gray-900'
            } focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              (!selectedCategory || filteredFiles.length === 0) 
                ? 'cursor-not-allowed opacity-50' 
                : 'cursor-pointer'
            }`}
          >
            <option value="">Select output format</option>
            {outputFormats.map((format) => (
              <option key={format.extension} value={format.extension}>
                {format.name} (.{format.extension})
              </option>
            ))}
          </select>
          {!selectedCategory && (
            <p className="mt-2 text-sm text-yellow-500">
              Please select a category from the sidebar first
            </p>
          )}
          {selectedCategory && filteredFiles.length === 0 && (
            <p className="mt-2 text-sm text-yellow-500">
              No files of this category type have been uploaded
            </p>
          )}
        </div>

        <div>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`flex items-center text-sm font-medium ${
              theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
            }`}
          >
            {showAdvanced ? (
              <>
                <ChevronUp size={16} className="mr-1" />
                Hide Advanced Options
              </>
            ) : (
              <>
                <ChevronDown size={16} className="mr-1" />
                Show Advanced Options
              </>
            )}
          </button>
        </div>

        {showAdvanced && (
          <div className="space-y-4 pt-2">
            <div>
              <label htmlFor="quality" className={`block mb-2 text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Quality: {conversionSettings.quality}%
              </label>
              <input
                id="quality"
                type="range"
                min="1"
                max="100"
                value={conversionSettings.quality}
                onChange={handleQualityChange}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
            </div>
            
            <div>
              <label className={`flex items-center mb-2 text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                <input
                  type="checkbox"
                  checked={conversionSettings.preserveMetadata}
                  onChange={(e) => updateConversionSettings({
                    ...conversionSettings,
                    preserveMetadata: e.target.checked
                  })}
                  className="w-4 h-4 mr-2 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                />
                Preserve metadata when possible
              </label>
            </div>
          </div>
        )}

        <div className="pt-2">
          <button
            onClick={handleStartConversion}
            disabled={filteredFiles.length === 0 || !selectedFormat}
            className={`w-full px-4 py-2 text-white rounded-md transition-colors duration-200 ${
              filteredFiles.length === 0 || !selectedFormat
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300'
            }`}
          >
            Start Conversion
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConversionOptions;