import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

jest.mock('../services/api', () => ({
  apiService: { isAuthenticated: () => false },
}));

jest.mock('../contexts/ThemeContext', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useTheme: () => ({ theme: 'light', toggleTheme: jest.fn() }),
}));

global.IntersectionObserver = class {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
} as any;

jest.mock('./hooks/useCarousel', () => ({
  useCarousel: () => ({ currentSlide: 0, goToSlide: jest.fn(), totalSlides: 3 }),
}));

import LandingPage from './LandingPage';

describe('LandingPage', () => {
  it('renders without crashing', () => {
    render(<LandingPage />);
    expect(screen.getAllByText(/Evalen/i).length).toBeGreaterThan(0);
  });

  it('renders the navbar with Evalen branding', () => {
    render(<LandingPage />);
    expect(screen.getAllByText(/Evalen/i).length).toBeGreaterThan(0);
  });

  describe('Hero demo modal', () => {
    it('renders the hero with the main heading', () => {
      render(<LandingPage />);
      expect(screen.getByText(/Reclutamiento inteligente/i)).toBeInTheDocument();
    });

    it('renders the demo CTA button', () => {
      render(<LandingPage />);
      expect(screen.getByRole('button', { name: /Ver demo en vivo/i })).toBeInTheDocument();
      expect(screen.getByText(/Ver el flujo completo/i)).toBeInTheDocument();
    });

    it('opens the DemoModal when the CTA button is clicked', () => {
      render(<LandingPage />);
      fireEvent.click(screen.getByRole('button', { name: /Ver demo en vivo/i }));
      expect(screen.getByRole('dialog', { name: /Demostración de Evalen/i })).toBeInTheDocument();
    });

    it('shows the input phase with CV and campaign data', () => {
      render(<LandingPage />);
      fireEvent.click(screen.getByRole('button', { name: /Ver demo en vivo/i }));
      expect(screen.getAllByText(/Ana María Alarcón/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Senior Python Developer/i).length).toBeGreaterThan(0);
      expect(screen.getByRole('button', { name: /Iniciar demo/i })).toBeInTheDocument();
    });

    it('starts processing phase on "Iniciar demo" click', async () => {
      render(<LandingPage />);
      fireEvent.click(screen.getByRole('button', { name: /Ver demo en vivo/i }));
      fireEvent.click(screen.getByRole('button', { name: /Iniciar demo/i }));
      await waitFor(() => {
        expect(screen.getByText(/Conectando con el parser/i)).toBeInTheDocument();
      });
    });

    it('closes the modal on Escape key', async () => {
      render(<LandingPage />);
      fireEvent.click(screen.getByRole('button', { name: /Ver demo en vivo/i }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      fireEvent.keyDown(document, { key: 'Escape' });
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
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
    const { container } = render(<LandingPage />);
    expect(screen.queryByText(/Empresas que confían/i)).toBeNull();
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
