import React, { useState, useRef, useEffect } from 'react';
import { MapPinIcon } from '@heroicons/react/24/outline';

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
}

interface LocationSuggestion {
  id: string;
  place_name: string;
  text: string;
  context?: Array<{ id: string; text: string }>;
}

const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  value,
  onChange,
  placeholder = 'Ej: Santiago, Región Metropolitana, Chile',
  error,
  required = false
}) => {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Mapbox Access Token from environment variables
  const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN || '';

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search function
  useEffect(() => {
    if (!value || value.length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsLoading(true);
      try {
        // Using Mapbox Geocoding API
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
            value
          )}.json?access_token=${MAPBOX_TOKEN}&types=place,locality,neighborhood,region,country&language=es&limit=5`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch locations');
        }

        const data = await response.json();
        setSuggestions(data.features || []);
        setIsOpen(data.features && data.features.length > 0);
      } catch (error) {
        console.error('Error fetching locations:', error);
        setSuggestions([]);
        setIsOpen(false);
      } finally {
        setIsLoading(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(delayDebounceFn);
  }, [value]);

  const handleSelectLocation = (location: LocationSuggestion) => {
    onChange(location.place_name);
    setIsOpen(false);
    setSuggestions([]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    if (e.target.value.length >= 3) {
      setIsOpen(true);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MapPinIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          required={required}
          className={`
            block w-full pl-10 pr-3 py-2 border rounded-lg
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            ${error ? 'border-red-500' : 'border-gray-300'}
            ${isLoading ? 'bg-gray-50' : 'bg-white'}
          `}
          autoComplete="off"
        />
        {isLoading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              onClick={() => handleSelectLocation(suggestion)}
              className="w-full text-left px-4 py-3 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none border-b border-gray-100 last:border-b-0 transition-colors"
            >
              <div className="flex items-start">
                <MapPinIcon className="h-5 w-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {suggestion.text}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {suggestion.place_name}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}

      {/* No results message */}
      {isOpen && !isLoading && suggestions.length === 0 && value.length >= 3 && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg p-4">
          <p className="text-sm text-gray-500 text-center">
            No se encontraron ubicaciones. Intenta con otro término.
          </p>
        </div>
      )}
    </div>
  );
};

export default LocationAutocomplete;
