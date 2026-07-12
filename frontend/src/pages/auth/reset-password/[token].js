import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { FaLeaf, FaEye, FaEyeSlash, FaLock, FaMoon, FaSun } from 'react-icons/fa';

export default function ResetPassword() {
  const router = useRouter();
  const { token } = router.query;
  const { resetPassword } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();

  const [formData, setFormData] = useState({ password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm() || !token) return;

    setLoading(true);
    await resetPassword(token, formData.password);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-yellow-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center py-8 sm:py-12 px-4 transition-colors duration-300">
      {/* Dark mode toggle */}
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Set New Password</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Choose a new password for your account</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {/* New Password */}
            <div>
              <label htmlFor="password" className="form-label">New Password</label>
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
                  placeholder="Enter new password"
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

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaLock className="text-gray-400 dark:text-gray-500" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`input-field pl-10 ${errors.confirmPassword ? 'border-red-500 dark:border-red-400' : ''}`}
                  placeholder="Re-enter new password"
                />
              </div>
              {errors.confirmPassword && <p className="error-text">{errors.confirmPassword}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-lg font-semibold text-white transition-colors bg-primary-600 hover:bg-primary-700 ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          Remembered your password?{' '}
          <Link href="/auth/login" className="text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
