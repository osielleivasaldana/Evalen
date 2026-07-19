import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock the apiService — Hero is now a self-contained maqueta, no network calls.
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

// Mock IntersectionObserver globally (used by useScrollAnimation and the navbar sentinel)
global.IntersectionObserver = class {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
} as any;

// Mock the carousel hook
jest.mock('./hooks/useCarousel', () => ({
  useCarousel: () => ({ currentSlide: 0, goToSlide: jest.fn(), totalSlides: 3 }),
}));

// Import LandingPage AFTER mocks are set up
import LandingPage from './LandingPage';

describe('LandingPage', () => {
  it('renders without crashing', () => {
    render(<LandingPage />);
    expect(screen.getAllByText(/Evalen/i).length).toBeGreaterThan(0);
  });

  it('renders the navbar with Evalen branding', () => {
    render(<LandingPage />);
    const evalenText = screen.getAllByText(/Evalen/i);
    expect(evalenText.length).toBeGreaterThan(0);
  });

  it('renders the hero with the main heading', () => {
    render(<LandingPage />);
    expect(screen.getByText(/Reclutamiento inteligente/i)).toBeInTheDocument();
  });

  it('renders the hero with an explicit demo CTA that opens the modal walkthrough', () => {
    render(<LandingPage />);
    expect(screen.getByRole('button', { name: /Ver demo en vivo/i })).toBeInTheDocument();
    // The preview card teases the full flow
    expect(screen.getByText(/Ver el flujo completo/i)).toBeInTheDocument();
  });

  it('renders the features section', () => {
    render(<LandingPage />);
    expect(screen.getByText(/Tu flujo de trabajo/i)).toBeInTheDocument();
  });

  it('renders the pricing section', () => {
    render(<LandingPage />);
    expect(screen.getByText(/Planes para cada/i)).toBeInTheDocument();
  });

  it('renders the "Cómo funciona" walkthrough (3 steps)', () => {
    const { container } = render(<LandingPage />);
    expect(screen.getAllByText(/Cómo funciona/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Sube los currículums/i)).toBeInTheDocument();
    expect(screen.getByText(/Configura la campaña/i)).toBeInTheDocument();
    expect(screen.getByText(/Recibe el ranking/i)).toBeInTheDocument();
    expect(container.textContent).toMatch(/01/);
    expect(container.textContent).toMatch(/02/);
    expect(container.textContent).toMatch(/03/);
  });

  it('surfaces the "Sin sesgos" claim as a visible brand statement', () => {
    render(<LandingPage />);
    expect(screen.getByText(/Sin sesgos de género ni edad/i)).toBeInTheDocument();
  });

  it('renders the footer with copyright', () => {
    render(<LandingPage />);
    expect(screen.getByText(/Todos los derechos reservados/i)).toBeInTheDocument();
  });

  it('does not ship fake "TrustedBy" company logos', () => {
    // Regression: the previous landing listed Stripe/Spotify/Notion as "customers".
    // The Whole TrustedBy component must not render.
    const { container } = render(<LandingPage />);
    const trustedByText = screen.queryByText(/Empresas que confían/i);
    expect(trustedByText).toBeNull();
    expect(container.textContent).not.toMatch(/Stripe|Spotify|Notion|Vercel|Shopify|Linear/i);
  });

  it('does not ship fabricated 10.000+ CVs / 500+ empresas metrics', () => {
    const { container } = render(<LandingPage />);
    expect(container.textContent).not.toMatch(/10\.000\+|10,000\+/i);
    expect(container.textContent).not.toMatch(/500\+ empresas/i);
  });

  it('does not show the "Smart Match Engine V2" dev-jargon eyebrow', () => {
    const { container } = render(<LandingPage />);
    expect(container.textContent).not.toMatch(/Smart Match Engine V2/i);
  });
});