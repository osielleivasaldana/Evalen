import React, { useState } from 'react';


interface AuthContainerProps {
  children: React.ReactNode;
}

const AuthContainer: React.FC<AuthContainerProps> = ({ children }) => {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '500px'
      }}>
        {children}
      </div>
    </div>
  );
};

export default AuthContainer;