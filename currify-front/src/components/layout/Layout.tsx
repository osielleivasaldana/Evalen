import React from 'react';
import NavBar from './NavBar';
import FooterFinal from './FooterFinal';

interface LayoutProps {
  children: React.ReactNode;
  showNavBar?: boolean;
  showFooter?: boolean;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  showNavBar = true,
  showFooter = true
}) => {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {showNavBar && <NavBar />}

      <main className="flex-grow flex flex-col">
        {children}
      </main>

      {showFooter && <FooterFinal />}
    </div>
  );
};

export default Layout;
