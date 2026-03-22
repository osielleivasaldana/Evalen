import React from 'react';
import { ThemeProvider } from '../contexts/ThemeContext';
import LandingNavbar from './components/LandingNavbar';
import HeroSection from './components/HeroSection';
import DemoSection from './components/DemoSection';
import FeaturesSection from './components/FeaturesSection';
import HowItWorks from './components/HowItWorks';
import LandingPricing from './components/LandingPricing';
import LandingFooter from './components/LandingFooter';

const LandingPage: React.FC = () => {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
        <LandingNavbar />
        <main>
          <HeroSection />
          <DemoSection />
          <FeaturesSection />
          <HowItWorks />
          <LandingPricing />
        </main>
        <LandingFooter />
      </div>
    </ThemeProvider>
  );
};

export default LandingPage;
