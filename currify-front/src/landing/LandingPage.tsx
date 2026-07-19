import React from 'react';
import { ThemeProvider } from '../contexts/ThemeContext';
import ErrorBoundary from '../components/common/ErrorBoundary';
import LandingNavbar from './components/LandingNavbar';
import HeroSection from './components/HeroSection';
import FeaturesSection from './components/FeaturesSection';
import GallerySection from './components/GallerySection';
import LandingPricing from './components/LandingPricing';
import LandingFooter from './components/LandingFooter';
import BackToTop from './components/BackToTop';

const LandingPage: React.FC = () => {
  return (
    <ThemeProvider>
      <div className="landing-page min-h-screen bg-[#ffffff] dark:bg-[#0f172a] transition-colors duration-500">
        <ErrorBoundary>
          <LandingNavbar />
        </ErrorBoundary>
        <main>
          <ErrorBoundary>
            <HeroSection />
          </ErrorBoundary>
          <ErrorBoundary>
            <FeaturesSection />
          </ErrorBoundary>
          <ErrorBoundary>
            <GallerySection />
          </ErrorBoundary>
          <ErrorBoundary>
            <LandingPricing />
          </ErrorBoundary>
        </main>
        <ErrorBoundary>
          <LandingFooter />
        </ErrorBoundary>
        <BackToTop />
      </div>
    </ThemeProvider>
  );
};

export default LandingPage;