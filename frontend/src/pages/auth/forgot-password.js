import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { FaLeaf, FaEnvelope, FaMoon, FaSun, FaArrowLeft } from 'react-icons/fa';

export default function ForgotPassword() {
  const { forgotPassword } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.match(/^\S+@\S+\.\S+$/)) {
      setError('Enter valid email address');
      return;
    }
    setError('');

    setLoading(true);
    const result = await forgotPassword(email);
    setLoading(false);

    if (result.success) {
      setSubmitted(true);
    }
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Forgot Password?</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {submitted
              ? "We've sent you a reset link"
              : "Enter your email and we'll send you a reset link"}
          </p>
        </div>

        <div className="card">
          {submitted ? (
            <div className="text-center py-4">
              <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-primary-100 dark:bg-primary-900 mb-4">
                <FaEnvelope className="h-6 w-6 text-primary-600 dark:text-primary-400" />
              </div>
              <p className="text-gray-700 dark:text-gray-300 mb-2">
                If an account exists for <span className="font-semibold">{email}</span>, a password reset link is on its way.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                The link expires in 30 minutes. Check your spam folder if you don't see it.
              </p>
              <Link href="/auth/login" className="block w-full btn-outline text-center py-3">
                Back to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
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
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); if (error) setError(''); }}
                    className={`input-field pl-10 ${error ? 'border-red-500 dark:border-red-400' : ''}`}
                    placeholder="yourname@gmail.com"
                  />
                </div>
                {error && <p className="error-text">{error}</p>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 rounded-lg font-semibold text-white transition-colors bg-primary-600 hover:bg-primary-700 ${
                  loading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>

              <Link
                href="/auth/login"
                className="flex items-center justify-center space-x-2 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
              >
                <FaArrowLeft className="h-3 w-3" />
                <span>Back to Login</span>
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
