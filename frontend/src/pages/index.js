import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { FaUserTie, FaTractor, FaLeaf, FaMoon, FaSun } from 'react-icons/fa';

export default function Home() {
  const { user, loading } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-yellow-50 dark:from-gray-900 dark:to-gray-800 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FaLeaf className="h-6 w-6 sm:h-8 sm:w-8 text-primary-600 dark:text-primary-400" />
              <span className="text-xl sm:text-2xl font-bold text-primary-700 dark:text-primary-400">Kisan App</span>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
                aria-label="Toggle dark mode"
              >
                {darkMode ? <FaSun className="h-5 w-5" /> : <FaMoon className="h-5 w-5" />}
              </button>
              <Link href="/auth/login" className="btn-outline text-sm sm:text-base">
                Login
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16">
        <div className="text-center mb-8 sm:mb-16">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Welcome to <span className="text-primary-600 dark:text-primary-400">Kisan App</span>
          </h1>
          <p className="text-base sm:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto px-4">
            A digital platform connecting farmers with government services for crop management,
            harvest prediction, and straw selling.
          </p>
        </div>

        {/* Role Selection */}
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-white mb-2">Select Your Role</h2>
          <p className="text-gray-600 dark:text-gray-400">Choose how you want to use the platform</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 max-w-4xl mx-auto">
          {/* Farmer Card */}
          <Link href="/auth/register?role=farmer">
            <div className="card hover:shadow-2xl dark:hover:shadow-primary-900/20 transition-all cursor-pointer border-2 border-transparent hover:border-primary-500 group h-full">
              <div className="text-center">
                <div className="w-16 h-16 sm:w-24 sm:h-24 bg-primary-100 dark:bg-primary-900/50 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 group-hover:bg-primary-200 dark:group-hover:bg-primary-800 transition-colors">
                  <FaTractor className="h-8 w-8 sm:h-12 sm:w-12 text-primary-600 dark:text-primary-400" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white mb-2 sm:mb-3">I am a Farmer</h3>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-4 sm:mb-6">
                  Register your farms, track crops, get harvest predictions, and sell straw to the government.
                </p>
                <ul className="text-left text-sm sm:text-base text-gray-600 dark:text-gray-300 space-y-2 mb-4 sm:mb-6">
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-primary-500 rounded-full mr-2 flex-shrink-0"></span>
                    <span>Register and manage multiple farms</span>
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-primary-500 rounded-full mr-2 flex-shrink-0"></span>
                    <span>Track crop growth and harvest dates</span>
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-primary-500 rounded-full mr-2 flex-shrink-0"></span>
                    <span>Sell straw with easy appointments</span>
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-primary-500 rounded-full mr-2 flex-shrink-0"></span>
                    <span>Direct bank transfer payments</span>
                  </li>
                </ul>
                <span className="btn-primary inline-block w-full sm:w-auto">
                  Register as Farmer
                </span>
              </div>
            </div>
          </Link>

          {/* Government Officer Card */}
          <Link href="/auth/register?role=government">
            <div className="card hover:shadow-2xl dark:hover:shadow-secondary-900/20 transition-all cursor-pointer border-2 border-transparent hover:border-secondary-500 group h-full">
              <div className="text-center">
                <div className="w-16 h-16 sm:w-24 sm:h-24 bg-secondary-100 dark:bg-secondary-900/50 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 group-hover:bg-secondary-200 dark:group-hover:bg-secondary-800 transition-colors">
                  <FaUserTie className="h-8 w-8 sm:h-12 sm:w-12 text-secondary-600 dark:text-secondary-400" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white mb-2 sm:mb-3">I am a Government Officer</h3>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-4 sm:mb-6">
                  Manage straw collection appointments, verify farmers, and process payments.
                </p>
                <ul className="text-left text-sm sm:text-base text-gray-600 dark:text-gray-300 space-y-2 mb-4 sm:mb-6">
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-secondary-500 rounded-full mr-2 flex-shrink-0"></span>
                    <span>View and manage appointments</span>
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-secondary-500 rounded-full mr-2 flex-shrink-0"></span>
                    <span>Verify farmer registrations</span>
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-secondary-500 rounded-full mr-2 flex-shrink-0"></span>
                    <span>Process straw collection</span>
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-secondary-500 rounded-full mr-2 flex-shrink-0"></span>
                    <span>Manage payment disbursement</span>
                  </li>
                </ul>
                <span className="btn-secondary inline-block w-full sm:w-auto">
                  Register as Officer
                </span>
              </div>
            </div>
          </Link>
        </div>

        {/* Already have account */}
        <div className="text-center mt-8 sm:mt-12">
          <p className="text-gray-600 dark:text-gray-400">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-semibold">
              Login here
            </Link>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-8 sm:mt-16 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="text-center text-gray-600 dark:text-gray-400">
            <p>&copy; {new Date().getFullYear()} Kisan App. All rights reserved.</p>
            <p className="mt-2 text-sm">Empowering Indian farmers through technology</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
