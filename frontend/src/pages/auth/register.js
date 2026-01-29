import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { FaLeaf, FaEye, FaEyeSlash, FaTractor, FaUserTie, FaMoon, FaSun } from 'react-icons/fa';

// Demo mode - allows any random data for testing
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

export default function Register() {
  const router = useRouter();
  const { role } = router.query;
  const { register, user, loading: authLoading } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();

  const [formData, setFormData] = useState({
    userType: 'farmer',
    name: '',
    phone: '',
    idType: 'aadhar',
    idNumber: '',
    email: '',
    password: '',
    confirmPassword: '',
    numberOfFarms: '1'
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (role && (role === 'farmer' || role === 'government')) {
      setFormData(prev => ({ ...prev, userType: role }));
    }
  }, [role]);

  useEffect(() => {
    if (!authLoading && user) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    // Skip phone validation in demo mode
    if (!DEMO_MODE && !formData.phone.match(/^[6-9]\d{9}$/)) {
      newErrors.phone = 'Enter valid 10-digit phone number starting with 6-9';
    } else if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    // Skip ID validation in demo mode
    if (!DEMO_MODE) {
      if (formData.idType === 'aadhar') {
        if (!formData.idNumber.match(/^\d{12}$/)) {
          newErrors.idNumber = 'Aadhar must be 12 digits';
        }
      } else {
        if (!formData.idNumber.match(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)) {
          newErrors.idNumber = 'Invalid PAN format (e.g., ABCDE1234F)';
        }
      }
    } else if (!formData.idNumber.trim()) {
      newErrors.idNumber = 'ID number is required';
    }

    if (!formData.email.match(/^\S+@\S+\.\S+$/)) {
      newErrors.email = 'Enter valid email address';
    }

    if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
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
    const { confirmPassword, ...submitData } = formData;
    submitData.numberOfFarms = parseInt(submitData.numberOfFarms);

    const result = await register(submitData);
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-yellow-50 dark:from-gray-900 dark:to-gray-800 py-6 sm:py-8 transition-colors duration-300">
      {/* Dark mode toggle */}
      <button
        onClick={toggleDarkMode}
        className="fixed top-4 right-4 p-2 rounded-lg bg-white dark:bg-gray-800 shadow-lg text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors z-50"
        aria-label="Toggle dark mode"
      >
        {darkMode ? <FaSun className="h-5 w-5" /> : <FaMoon className="h-5 w-5" />}
      </button>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <Link href="/" className="inline-flex items-center space-x-2 mb-4 sm:mb-6">
            <FaLeaf className="h-6 w-6 sm:h-8 sm:w-8 text-primary-600 dark:text-primary-400" />
            <span className="text-xl sm:text-2xl font-bold text-primary-700 dark:text-primary-400">Kisan App</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Create Your Account</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Register as a {formData.userType === 'farmer' ? 'Farmer' : 'Government Officer'}
          </p>
        </div>

        {/* Role Toggle */}
        <div className="flex justify-center mb-6 sm:mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-1 shadow-md flex w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, userType: 'farmer' }))}
              className={`flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 sm:px-6 py-3 rounded-lg transition-colors ${
                formData.userType === 'farmer'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              <FaTractor />
              <span>Farmer</span>
            </button>
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, userType: 'government' }))}
              className={`flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 sm:px-6 py-3 rounded-lg transition-colors ${
                formData.userType === 'government'
                  ? 'bg-secondary-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              <FaUserTie />
              <span>Government</span>
            </button>
          </div>
        </div>

        {/* Registration Form */}
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {/* Name */}
            <div>
              <label htmlFor="name" className="form-label">Full Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`input-field ${errors.name ? 'border-red-500 dark:border-red-400' : ''}`}
                placeholder="Enter your full name"
              />
              {errors.name && <p className="error-text">{errors.name}</p>}
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="form-label">Phone Number *</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className={`input-field ${errors.phone ? 'border-red-500 dark:border-red-400' : ''}`}
                placeholder="10-digit phone number"
                maxLength={10}
              />
              {errors.phone && <p className="error-text">{errors.phone}</p>}
            </div>

            {/* ID Type Selection */}
            <div>
              <label className="form-label">ID Verification *</label>
              <div className="flex space-x-4 mb-3">
                <label className="flex items-center text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input
                    type="radio"
                    name="idType"
                    value="aadhar"
                    checked={formData.idType === 'aadhar'}
                    onChange={handleChange}
                    className="mr-2"
                  />
                  Aadhar Card
                </label>
                <label className="flex items-center text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input
                    type="radio"
                    name="idType"
                    value="pan"
                    checked={formData.idType === 'pan'}
                    onChange={handleChange}
                    className="mr-2"
                  />
                  PAN Card
                </label>
              </div>
              <input
                type="text"
                id="idNumber"
                name="idNumber"
                value={formData.idNumber}
                onChange={handleChange}
                className={`input-field ${errors.idNumber ? 'border-red-500 dark:border-red-400' : ''}`}
                placeholder={formData.idType === 'aadhar' ? '12-digit Aadhar number' : 'PAN number (e.g., ABCDE1234F)'}
                maxLength={formData.idType === 'aadhar' ? 12 : 10}
              />
              {errors.idNumber && <p className="error-text">{errors.idNumber}</p>}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="form-label">Gmail ID *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`input-field ${errors.email ? 'border-red-500 dark:border-red-400' : ''}`}
                placeholder="yourname@gmail.com"
              />
              {errors.email && <p className="error-text">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="form-label">Password *</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`input-field pr-10 ${errors.password ? 'border-red-500 dark:border-red-400' : ''}`}
                  placeholder="Minimum 6 characters"
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
              <label htmlFor="confirmPassword" className="form-label">Confirm Password *</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`input-field ${errors.confirmPassword ? 'border-red-500 dark:border-red-400' : ''}`}
                placeholder="Re-enter your password"
              />
              {errors.confirmPassword && <p className="error-text">{errors.confirmPassword}</p>}
            </div>

            {/* Number of Farms (only for farmers) */}
            {formData.userType === 'farmer' && (
              <div>
                <label htmlFor="numberOfFarms" className="form-label">Number of Farms</label>
                <select
                  id="numberOfFarms"
                  name="numberOfFarms"
                  value={formData.numberOfFarms}
                  onChange={handleChange}
                  className="input-field"
                >
                  {[...Array(11)].map((_, i) => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">You can register your farms later in the dashboard</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-lg font-semibold text-white transition-colors ${
                formData.userType === 'farmer'
                  ? 'bg-primary-600 hover:bg-primary-700'
                  : 'bg-secondary-500 hover:bg-secondary-600'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-semibold">
                Login here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
