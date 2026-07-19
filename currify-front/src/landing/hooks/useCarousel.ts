import { useState, useEffect, useCallback } from 'react';

export interface UseCarouselReturn {
  currentSlide: number;
  goToSlide: (index: number) => void;
  totalSlides: number;
}

export function useCarousel(totalSlides: number, intervalMs: number = 4000): UseCarouselReturn {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % totalSlides);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [totalSlides, intervalMs]);

  const goToSlide = useCallback((index: number) => {
    setCurrentSlide(index);
  }, []);

  return { currentSlide, goToSlide, totalSlides };
}
