import React, { useState } from 'react';
import { apiService, LoginRequest } from '../../services/api';

interface LoginProps {
  onLoginSuccess: () => void;
  onSwitchToRegister: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess, onSwitchToRegister }) => {
  const [credentials, setCredentials] = useState<LoginRequest>({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await apiService.login(credentials);
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión. Verifique sus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div style={{
      maxWidth: '450px',
      margin: '0 auto',
      padding: '40px 30px',
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      border: '1px solid #e1e5e9'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h2 style={{
          color: '#2c3e50',
          fontSize: '28px',
          fontWeight: 'bold',
          marginBottom: '8px'
        }}>
          Iniciar Sesión
        </h2>
        <p style={{ color: '#7f8c8d', fontSize: '16px', margin: 0 }}>
          Accede a tu cuenta de Currify
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '20px' }}>
          <label htmlFor="email" style={{
            display: 'block',
            marginBottom: '6px',
            color: '#2c3e50',
            fontWeight: '500',
            fontSize: '14px'
          }}>
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={credentials.email}
            onChange={handleInputChange}
            required
            placeholder="tu@empresa.com"
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #e1e5e9',
              borderRadius: '8px',
              fontSize: '14px',
              boxSizing: 'border-box',
              transition: 'border-color 0.3s ease',
              outline: 'none'
            }}
            onFocus={(e) => e.target.style.borderColor = '#3498db'}
            onBlur={(e) => e.target.style.borderColor = '#e1e5e9'}
          />
        </div>

        <div style={{ marginBottom: '25px' }}>
          <label htmlFor="password" style={{
            display: 'block',
            marginBottom: '6px',
            color: '#2c3e50',
            fontWeight: '500',
            fontSize: '14px'
          }}>
            Contraseña
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              value={credentials.password}
              onChange={handleInputChange}
              required
              placeholder="Tu contraseña"
              style={{
                width: '100%',
                padding: '12px 50px 12px 16px',
                border: '2px solid #e1e5e9',
                borderRadius: '8px',
                fontSize: '14px',
                boxSizing: 'border-box',
                transition: 'border-color 0.3s ease',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3498db'}
              onBlur={(e) => e.target.style.borderColor = '#e1e5e9'}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#7f8c8d',
                fontSize: '14px'
              }}
            >
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
        </div>

        {error && (
          <div style={{
            color: '#e74c3c',
            marginBottom: '20px',
            padding: '12px 16px',
            backgroundColor: '#fdf2f2',
            border: '1px solid #f5c6cb',
            borderRadius: '8px',
            fontSize: '14px'
          }}>
            ❌ {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px',
            backgroundColor: loading ? '#bdc3c7' : '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: '600',
            transition: 'background-color 0.3s ease',
            boxShadow: loading ? 'none' : '0 2px 4px rgba(52, 152, 219, 0.3)'
          }}
          onMouseOver={(e) => !loading && ((e.target as HTMLButtonElement).style.backgroundColor = '#2980b9')}
          onMouseOut={(e) => !loading && ((e.target as HTMLButtonElement).style.backgroundColor = '#3498db')}
        >
          {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
        </button>
      </form>

      <div style={{
        textAlign: 'center',
        marginTop: '25px',
        paddingTop: '20px',
        borderTop: '1px solid #e1e5e9'
      }}>
        <p style={{ color: '#7f8c8d', fontSize: '14px', margin: 0 }}>
          ¿No tienes una cuenta?{' '}
          <button
            onClick={onSwitchToRegister}
            style={{
              background: 'none',
              border: 'none',
              color: '#3498db',
              cursor: 'pointer',
              textDecoration: 'underline',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Crear Cuenta
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;