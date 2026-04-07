import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { apiService, UserProfile } from '../services/api';

interface AuthContextType {
  isAuthenticated: boolean;
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
  setUser: (user: UserProfile | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUserState] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Wrapper that updates both user AND isAuthenticated in sync
  const setUser = useCallback((newUser: UserProfile | null) => {
    setUserState(newUser);
    setIsAuthenticated(!!newUser);
  }, []);

  // Check auth status on mount
  const checkAuth = useCallback(async (): Promise<boolean> => {
    try {
      if (apiService.isAuthenticated()) {
        const profile = await apiService.getProfile();
        setUser(profile);
        return true;
      }
      return false;
    } catch (error) {
      apiService.clearToken();
      setUser(null);
      return false;
    }
  }, [setUser]);

  useEffect(() => {
    const init = async () => {
      await checkAuth();
      setLoading(false);
    };
    init();
  }, [checkAuth]);

  const login = async (email: string, password: string): Promise<void> => {
    await apiService.login({ email, password });
    const profile = await apiService.getProfile();
    setUser(profile);
  };

  const register = async (email: string, password: string, name: string): Promise<void> => {
    await apiService.register({ email, password, name, company: '' });
    const profile = await apiService.getProfile();
    setUser(profile);
  };

  const logout = useCallback(() => {
    apiService.clearToken();
    setUser(null);
  }, [setUser]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        loading,
        login,
        register,
        logout,
        checkAuth,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
