import React, { useState, useRef, useEffect } from 'react';

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

  const isSelectionRef = useRef(false);

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
    // Skip search if the update comes from a selection
    if (isSelectionRef.current) {
      isSelectionRef.current = false;
      return;
    }

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
    isSelectionRef.current = true; // Mark as selection to prevent re-search
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
          <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 21s-7-4.4-7-10a7 7 0 0 1 14 0c0 5.6-7 10-7 10z"/>
            <circle cx="12" cy="11" r="2.4"/>
          </svg>
        </div>
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          required={required}
          className={`
            w-full rounded-xl border border-line2 bg-card py-3 pl-11 pr-4 text-[15px] text-ink placeholder:text-ink3/80 transition
            focus:border-green focus:outline-none focus:ring-2 focus:ring-green/25
            ${error ? 'border-low' : ''}
            t-card t-ink t-line2
          `}
          autoComplete="off"
        />
        {isLoading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <div className="animate-spin h-4 w-4 border-2 border-green border-t-transparent rounded-full"></div>
          </div>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-card border border-line2 rounded-lg shadow-card max-h-60 overflow-auto">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              onClick={() => handleSelectLocation(suggestion)}
              className="w-full text-left px-4 py-3 hover:bg-greentint focus:bg-greentint focus:outline-none border-b border-line2 last:border-b-0 transition-colors"
            >
              <div className="flex items-start">
                <svg className="h-[18px] w-[18px] text-green mr-3 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 21s-7-4.4-7-10a7 7 0 0 1 14 0c0 5.6-7 10-7 10z"/>
                  <circle cx="12" cy="11" r="2.4"/>
                </svg>
                <div>
                  <p className="text-sm font-medium text-ink">
                    {suggestion.text}
                  </p>
                  <p className="text-xs text-ink2 mt-0.5">
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
        <p className="mt-1 text-sm text-low">{error}</p>
      )}

      {/* No results message */}
      {isOpen && !isLoading && suggestions.length === 0 && value.length >= 3 && (
        <div className="absolute z-10 mt-1 w-full bg-card border border-line2 rounded-lg shadow-card p-4">
          <p className="text-sm text-ink3 text-center">
            No se encontraron ubicaciones. Intenta con otro término.
          </p>
        </div>
      )}
    </div>
  );
};

export default LocationAutocomplete;
