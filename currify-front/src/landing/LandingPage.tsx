import React from 'react';
import { ThemeProvider } from '../contexts/ThemeContext';
import ErrorBoundary from '../components/common/ErrorBoundary';
import LandingNavbar from './components/LandingNavbar';
import HeroSection from './components/HeroSection';
import LogoCloud from './components/LogoCloud';
import FeaturesSection from './components/FeaturesSection';
import DemoSection from './components/DemoSection';
import HowItWorks from './components/HowItWorks';
import Testimonials from './components/Testimonials';
import LandingPricing from './components/LandingPricing';
import CTABanner from './components/CTABanner';
import LandingFooter from './components/LandingFooter';

const LandingPage: React.FC = () => {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-[#fdfdfd] dark:bg-[#030014] transition-colors duration-300">
        <ErrorBoundary>
          <LandingNavbar />
        </ErrorBoundary>
        <main>
          <ErrorBoundary>
            <HeroSection />
          </ErrorBoundary>
          <ErrorBoundary>
            <LogoCloud />
          </ErrorBoundary>
          <ErrorBoundary>
            <FeaturesSection />
          </ErrorBoundary>
          <ErrorBoundary>
            <DemoSection />
          </ErrorBoundary>
          <ErrorBoundary>
            <HowItWorks />
          </ErrorBoundary>
          <ErrorBoundary>
            <Testimonials />
          </ErrorBoundary>
          <ErrorBoundary>
            <LandingPricing />
          </ErrorBoundary>
          <ErrorBoundary>
            <CTABanner />
          </ErrorBoundary>
        </main>
        <ErrorBoundary>
          <LandingFooter />
        </ErrorBoundary>
      </div>
    </ThemeProvider>
  );
};

export default LandingPage;
