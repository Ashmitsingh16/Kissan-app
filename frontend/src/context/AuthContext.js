import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { authAPI } from '../utils/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      }
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      const { token, ...user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      toast.success('Registration successful!');
      router.push('/dashboard');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || error.response?.data?.errors?.[0]?.msg || 'Registration failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const login = async (email, password) => {
    try {
      const response = await authAPI.login({ email, password });
      const { token, ...user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      toast.success('Login successful!');
      router.push('/dashboard');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    toast.success('Logged out successfully');
    router.push('/');
  };

  const updateUser = (updatedData) => {
    const newUser = { ...user, ...updatedData };
    localStorage.setItem('user', JSON.stringify(newUser));
    setUser(newUser);
  };

  const forgotPassword = async (email) => {
    try {
      const response = await authAPI.forgotPassword({ email });
      toast.success(response.data.message || 'Reset link sent! Check your email.');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || error.response?.data?.errors?.[0]?.msg || 'Something went wrong';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const resetPassword = async (token, password) => {
    try {
      const response = await authAPI.resetPassword(token, { password });
      const { token: authToken, ...userData } = response.data;
      if (authToken) {
        localStorage.setItem('token', authToken);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
      }
      toast.success('Password reset successful!');
      router.push('/dashboard');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || error.response?.data?.errors?.[0]?.msg || 'Reset link is invalid or expired';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      register,
      login,
      logout,
      updateUser,
      forgotPassword,
      resetPassword,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
};
