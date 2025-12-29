import React, { useState } from 'react';
import Login from './Login';
import Register from './Register';

interface AuthContainerProps {
  onAuthSuccess: () => void;
}

type AuthMode = 'login' | 'register';

const AuthContainer: React.FC<AuthContainerProps> = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('login');

  const handleSwitchToRegister = () => {
    setMode('register');
  };

  const handleSwitchToLogin = () => {
    setMode('login');
  };

  if (mode === 'login') {
    return (
      <Login
        onLoginSuccess={onAuthSuccess}
        onSwitchToRegister={handleSwitchToRegister}
      />
    );
  }

  // Register Mode - Keep legacy centered layout
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
        <Register
          onRegisterSuccess={onAuthSuccess}
          onSwitchToLogin={handleSwitchToLogin}
        />
      </div>
    </div>
  );
};

export default AuthContainer;