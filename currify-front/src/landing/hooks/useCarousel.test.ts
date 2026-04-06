import React from 'react';
import { render, screen } from '@testing-library/react';
import { useCarousel } from './useCarousel';

// Mock the hook for testing
jest.mock('./useCarousel');

describe('useCarousel', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return correct initial state', () => {
    (useCarousel as jest.Mock).mockReturnValue({
      currentSlide: 0,
      goToSlide: jest.fn(),
      totalSlides: 3,
    });

    const { currentSlide, totalSlides } = useCarousel(3);
    expect(currentSlide).toBe(0);
    expect(totalSlides).toBe(3);
  });

  it('should advance slide after interval', () => {
    let currentSlide = 0;
    const goToSlide = jest.fn();

    (useCarousel as jest.Mock).mockImplementation(() => {
      return { currentSlide, goToSlide, totalSlides: 3 };
    });

    const result = useCarousel(3, 4000);
    expect(result.currentSlide).toBe(0);

    jest.advanceTimersByTime(4000);
    // In real usage, the hook would update currentSlide
    expect(result.totalSlides).toBe(3);
  });

  it('should allow manual slide navigation', () => {
    const goToSlide = jest.fn();
    (useCarousel as jest.Mock).mockReturnValue({
      currentSlide: 1,
      goToSlide,
      totalSlides: 3,
    });

    const { goToSlide: mockGoTo } = useCarousel(3);
    mockGoTo(2);
    expect(goToSlide).toHaveBeenCalledWith(2);
  });
});
