import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock the apiService
jest.mock('../services/api', () => ({
  apiService: {
    isAuthenticated: () => false,
  },
}));

// Mock the ThemeContext
jest.mock('../contexts/ThemeContext', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useTheme: () => ({ theme: 'light', toggleTheme: jest.fn() }),
}));

// Mock IntersectionObserver
jest.mock('./hooks/useScrollAnimation', () => ({
  useScrollAnimation: () => ({ ref: { current: null }, isVisible: true }),
}));

// Mock the carousel hook
jest.mock('./hooks/useCarousel', () => ({
  useCarousel: () => ({ currentSlide: 0, goToSlide: jest.fn(), totalSlides: 3 }),
}));

// Import LandingPage AFTER mocks are set up
import LandingPage from './LandingPage';

describe('LandingPage', () => {
  it('should render without crashing', () => {
    render(<LandingPage />);
    expect(screen.getAllByText(/Evalen/i).length).toBeGreaterThan(0);
  });

  it('should render the navbar with Evalen branding', () => {
    render(<LandingPage />);
    const evalenText = screen.getAllByText(/Evalen/i);
    expect(evalenText.length).toBeGreaterThan(0);
  });

  it('should render the hero section with main heading', () => {
    render(<LandingPage />);
    expect(screen.getByText(/Reclutamiento inteligente/i)).toBeInTheDocument();
  });

  it('should render the features section', () => {
    render(<LandingPage />);
    expect(screen.getByText(/¿Por qué/i)).toBeInTheDocument();
  });

  it('should render the pricing section', () => {
    render(<LandingPage />);
    expect(screen.getByText(/Planes para cada/i)).toBeInTheDocument();
  });

  it('should render the footer with copyright', () => {
    render(<LandingPage />);
    expect(screen.getByText(/Todos los derechos reservados/i)).toBeInTheDocument();
  });
});
