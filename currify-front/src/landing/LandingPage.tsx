import React, { useEffect } from 'react';
import './landing-evalen.css';
import LandingNavbar from './components/LandingNavbar';
import HeroSection from './components/HeroSection';
import BenefitsStrip from './components/BenefitsStrip';
import HowItWorksSection from './components/HowItWorksSection';
import AnalysisSection from './components/AnalysisSection';
import ProcessSection from './components/ProcessSection';
import PricingSection from './components/PricingSection';
import FAQSection from './components/FAQSection';
import ClosingSection from './components/ClosingSection';
import FooterSection from './components/FooterSection';
import { usePlans } from './hooks/usePlans';

const LandingPage: React.FC = () => {
  const plans = usePlans();

  useEffect(() => {
    document.body.classList.add('lp-root');
    return () => document.body.classList.remove('lp-root');
  }, []);

  return (
    <div className="lp-root">
      <LandingNavbar />
      <main id="top">
        <HeroSection />
        <BenefitsStrip />
        <HowItWorksSection />
        <AnalysisSection />
        <ProcessSection />
        <PricingSection plans={plans} />
        <FAQSection />
        <ClosingSection plans={plans} />
      </main>
      <FooterSection />
    </div>
  );
};

export default LandingPage;
