import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import { initializeSocket, disconnectSocket } from '../services/socket';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load user and token from localStorage on mount
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      
      // Initialize socket with token
      initializeSocket(savedToken);
    }

    setLoading(false);
  }, []);

  const login = async (credentials) => {
    try {
      const response = await authAPI.login(credentials);
      
      setToken(response.token);
      setUser(response.user);
      
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      // Initialize socket
      initializeSocket(response.token);
      
      toast.success('Login successful!');
      return response;
    } catch (error) {
      throw error;
    }
  };

  const register = async (data) => {
    try {
      const response = await authAPI.register(data);
      
      setToken(response.token);
      setUser(response.user);
      
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      // Initialize socket
      initializeSocket(response.token);
      
      toast.success('Registration successful!');
      return response;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Disconnect socket
    disconnectSocket();
    
    toast.success('Logged out successfully');
  };

  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const hasRole = (role) => {
    return user?.roles?.includes(role) || false;
  };

  const isAdmin = hasRole('admin');
  const isSeller = hasRole('seller');

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token,
    isAdmin,
    isSeller,
    login,
    register,
    logout,
    updateUser,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

