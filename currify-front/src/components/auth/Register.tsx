import React, { useState } from 'react';
import { apiService, RegisterRequest } from '../../services/api';

interface RegisterProps {
  onRegisterSuccess: () => void;
  onSwitchToLogin: () => void;
}

const Register: React.FC<RegisterProps> = ({ onRegisterSuccess, onSwitchToLogin }) => {
  const [formData, setFormData] = useState<RegisterRequest>({
    email: '',
    password: '',
    name: '',
    company: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await apiService.register(formData);
      onRegisterSuccess();
    } catch (err: any) {
      setError(err.message || 'Error al registrarse. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
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
          Crear Cuenta
        </h2>
        <p style={{ color: '#7f8c8d', fontSize: '16px', margin: 0 }}>
          Únete a Evalen y comienza a gestionar tus procesos de selección
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '20px' }}>
          <label htmlFor="name" style={{
            display: 'block',
            marginBottom: '6px',
            color: '#2c3e50',
            fontWeight: '500',
            fontSize: '14px'
          }}>
            Nombre Completo
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            required
            placeholder="Ingresa tu nombre completo"
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

        <div style={{ marginBottom: '20px' }}>
          <label htmlFor="company" style={{
            display: 'block',
            marginBottom: '6px',
            color: '#2c3e50',
            fontWeight: '500',
            fontSize: '14px'
          }}>
            Empresa
          </label>
          <input
            type="text"
            id="company"
            name="company"
            value={formData.company}
            onChange={handleInputChange}
            required
            placeholder="Nombre de tu empresa"
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

        <div style={{ marginBottom: '20px' }}>
          <label htmlFor="email" style={{
            display: 'block',
            marginBottom: '6px',
            color: '#2c3e50',
            fontWeight: '500',
            fontSize: '14px'
          }}>
            Email Corporativo
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            required
            placeholder="empresa@dominio.com"
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
              value={formData.password}
              onChange={handleInputChange}
              required
              placeholder="Mínimo 8 caracteres"
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
          {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
        </button>
      </form>

      <div style={{
        textAlign: 'center',
        marginTop: '25px',
        paddingTop: '20px',
        borderTop: '1px solid #e1e5e9'
      }}>
        <p style={{ color: '#7f8c8d', fontSize: '14px', margin: 0 }}>
          ¿Ya tienes una cuenta?{' '}
          <button
            onClick={onSwitchToLogin}
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
            Iniciar Sesión
          </button>
        </p>
      </div>
    </div>
  );
};

export default Register;