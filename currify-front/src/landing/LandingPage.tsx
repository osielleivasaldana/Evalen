import React from 'react';
import { ThemeProvider } from '../contexts/ThemeContext';
import './landing-new.css';
import LandingNavbar from './components/LandingNavbar';
import HeroSection from './components/HeroSection';
import ProblemSection from './components/ProblemSection';
import HowItWorksSection from './components/HowItWorksSection';
import DemoSection from './components/DemoSection';
import BenefitsSection from './components/BenefitsSection';
import TestimonialsSection from './components/TestimonialsSection';
import PricingSection from './components/PricingSection';
import FAQSection from './components/FAQSection';
import FooterSection from './components/FooterSection';

const LandingPage: React.FC = () => {
  return (
    <ThemeProvider>
      <div className="topbar" id="topbar">
        <span className="star">✦</span>
        <span>Nuevo: <b>Smart Match semántico</b> — ya evalúa significado, no palabras clave.</span>
        <a href="/login?plan=free">Ver cómo →</a>
      </div>
      <LandingNavbar />
      <main id="top">
        <HeroSection />
        <ProblemSection />
        <HowItWorksSection />
        <DemoSection />
        <BenefitsSection />
        <TestimonialsSection />
        <PricingSection />
        <FAQSection />
      </main>
      <FooterSection />
    </ThemeProvider>
  );
};

export default LandingPage;
