import { useState, useEffect, useCallback } from 'react';

interface UseCarouselReturn {
  currentSlide: number;
  goToSlide: (index: number) => void;
  totalSlides: number;
}

export function useCarousel(totalSlides: number, intervalMs: number = 4000): UseCarouselReturn {
  const [currentSlide, setCurrentSlide] = useState(0);

  const goToSlide = useCallback((index: number) => {
    setCurrentSlide(index);
  }, []);

  useEffect(() => {
    if (totalSlides <= 1) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % totalSlides);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [totalSlides, intervalMs]);

  return { currentSlide, goToSlide, totalSlides };
}
