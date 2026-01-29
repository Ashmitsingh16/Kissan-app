import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { FaLeaf, FaEye, FaEyeSlash, FaEnvelope, FaLock, FaMoon, FaSun, FaTractor, FaUserTie } from 'react-icons/fa';

export default function Login() {
  const router = useRouter();
  const { login, user, loading: authLoading } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();

  const [selectedRole, setSelectedRole] = useState('farmer');
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.match(/^\S+@\S+\.\S+$/)) {
      newErrors.email = 'Enter valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    await login(formData.email, formData.password);
    setLoading(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-yellow-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center py-8 sm:py-12 px-4 transition-colors duration-300">
      {/* Dark mode toggle - fixed position */}
      <button
        onClick={toggleDarkMode}
        className="fixed top-4 right-4 p-2 rounded-lg bg-white dark:bg-gray-800 shadow-lg text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors z-50"
        aria-label="Toggle dark mode"
      >
        {darkMode ? <FaSun className="h-5 w-5" /> : <FaMoon className="h-5 w-5" />}
      </button>

      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <Link href="/" className="inline-flex items-center space-x-2 mb-4 sm:mb-6">
            <FaLeaf className="h-8 w-8 sm:h-10 sm:w-10 text-primary-600 dark:text-primary-400" />
            <span className="text-2xl sm:text-3xl font-bold text-primary-700 dark:text-primary-400">Kisan App</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Welcome Back</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Login to access your dashboard</p>
        </div>

        {/* Role Selection */}
        <div className="flex justify-center mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-1 shadow-md flex w-full max-w-md">
            <button
              type="button"
              onClick={() => setSelectedRole('farmer')}
              className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-colors ${
                selectedRole === 'farmer'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              <FaTractor />
              <span>Farmer</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedRole('government')}
              className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-colors ${
                selectedRole === 'government'
                  ? 'bg-secondary-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              <FaUserTie />
              <span>Officer</span>
            </button>
          </div>
        </div>

        {/* Login Form */}
        <div className="card">
          <div className="text-center mb-4">
            <p className="text-gray-600 dark:text-gray-400">
              Login as <span className={`font-semibold ${selectedRole === 'farmer' ? 'text-primary-600 dark:text-primary-400' : 'text-secondary-500 dark:text-secondary-400'}`}>
                {selectedRole === 'farmer' ? 'Farmer' : 'Government Officer'}
              </span>
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {/* Email */}
            <div>
              <label htmlFor="email" className="form-label">Gmail ID</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaEnvelope className="text-gray-400 dark:text-gray-500" />
                </div>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`input-field pl-10 ${errors.email ? 'border-red-500 dark:border-red-400' : ''}`}
                  placeholder="yourname@gmail.com"
                />
              </div>
              {errors.email && <p className="error-text">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="form-label">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaLock className="text-gray-400 dark:text-gray-500" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`input-field pl-10 pr-10 ${errors.password ? 'border-red-500 dark:border-red-400' : ''}`}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {errors.password && <p className="error-text">{errors.password}</p>}
            </div>

            {/* Forgot Password Link */}
            <div className="text-right">
              <Link href="/auth/forgot-password" className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300">
                Forgot Password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-lg font-semibold text-white transition-colors ${
                selectedRole === 'farmer'
                  ? 'bg-primary-600 hover:bg-primary-700'
                  : 'bg-secondary-500 hover:bg-secondary-600'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Logging in...' : `Login as ${selectedRole === 'farmer' ? 'Farmer' : 'Officer'}`}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">New to Kisan App?</span>
            </div>
          </div>

          {/* Register Link */}
          <Link href="/" className="block w-full btn-outline text-center py-3">
            Create New Account
          </Link>
        </div>

        {/* Info Box */}
        <div className="mt-6 sm:mt-8 bg-white dark:bg-gray-800 rounded-lg shadow p-4 transition-colors duration-300">
          <h3 className="font-semibold text-gray-800 dark:text-white mb-2">How it works:</h3>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <li>1. Login with your registered Gmail ID and password</li>
            <li>2. Access your personalized dashboard</li>
            <li>3. Manage farms, crops, and appointments</li>
            <li>4. Track payments and straw selling</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
