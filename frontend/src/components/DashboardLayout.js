import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  FaLeaf,
  FaHome,
  FaTractor,
  FaCalendarAlt,
  FaUniversity,
  FaUser,
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaChartLine,
  FaHeadset,
  FaBell,
  FaTruck,
  FaCloudSun,
  FaMoon,
  FaSun,
  FaExclamationTriangle,
  FaInfoCircle
} from 'react-icons/fa';

export default function DashboardLayout({ children }) {
  const { user, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const farmerNavItems = [
    { name: 'Dashboard', href: '/dashboard', icon: FaHome },
    { name: 'My Farms', href: '/dashboard/farms', icon: FaTractor },
    { name: 'Weather', href: '/dashboard/weather', icon: FaCloudSun },
    { name: 'Appointments', href: '/dashboard/appointments', icon: FaCalendarAlt },
    { name: 'How It Works', href: '/dashboard/how-it-works', icon: FaInfoCircle },
    { name: 'Bank Details', href: '/dashboard/bank-details', icon: FaUniversity },
    { name: 'Support', href: '/dashboard/support', icon: FaHeadset },
    { name: 'Profile', href: '/dashboard/profile', icon: FaUser },
  ];

  const governmentNavItems = [
    { name: 'Dashboard', href: '/dashboard/government', icon: FaHome },
    { name: 'Bookings & Alerts', href: '/dashboard/government/bookings', icon: FaBell },
    { name: 'Route Planning', href: '/dashboard/government/routes', icon: FaTruck },
    { name: 'Statistics', href: '/dashboard/government/statistics', icon: FaChartLine },
    { name: 'Profile', href: '/dashboard/profile', icon: FaUser },
  ];

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    logout();
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  const navItems = user?.userType === 'farmer' ? farmerNavItems : governmentNavItems;

  const isActive = (href) => {
    if (href === '/dashboard' || href === '/dashboard/government') {
      return router.pathname === href;
    }
    return router.pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-30 h-full w-64 bg-white dark:bg-gray-800 shadow-lg dark:shadow-gray-900/50 transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <Link href={user?.userType === 'government' ? '/dashboard/government' : '/dashboard'} className="flex items-center space-x-2">
              <FaLeaf className="h-8 w-8 text-primary-600 dark:text-primary-400" />
              <span className="text-xl font-bold text-primary-700 dark:text-primary-400">Kisan App</span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <FaTimes className="h-6 w-6" />
            </button>
          </div>

          {/* User Info */}
          <div className={`p-4 border-b border-gray-200 dark:border-gray-700 ${
            user?.userType === 'government'
              ? 'bg-blue-50 dark:bg-blue-900/30'
              : 'bg-gray-50 dark:bg-gray-700/50'
          }`}>
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                user?.userType === 'government'
                  ? 'bg-blue-100 dark:bg-blue-800'
                  : 'bg-primary-100 dark:bg-primary-800'
              }`}>
                <FaUser className={user?.userType === 'government'
                  ? 'text-blue-600 dark:text-blue-300'
                  : 'text-primary-600 dark:text-primary-300'
                } />
              </div>
              <div>
                <p className="font-semibold text-gray-800 dark:text-white">{user?.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                  {user?.userType === 'government' ? 'Government Officer' : 'Farmer'}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive(item.href)
                    ? user?.userType === 'government'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                      : 'bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <span className="truncate">{item.name}</span>
              </Link>
            ))}
          </nav>

          {/* Dark Mode Toggle & Logout */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="flex items-center space-x-3 px-4 py-3 w-full rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
            >
              {darkMode ? (
                <>
                  <FaSun className="h-5 w-5 text-yellow-500" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <FaMoon className="h-5 w-5 text-gray-500" />
                  <span>Dark Mode</span>
                </>
              )}
            </button>

            {/* Logout */}
            <button
              onClick={handleLogoutClick}
              className="flex items-center space-x-3 px-4 py-3 w-full rounded-lg text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors"
            >
              <FaSignOutAlt className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 m-4 max-w-sm w-full">
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 dark:bg-red-900/50 rounded-full">
              <FaExclamationTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-center text-gray-800 dark:text-white mb-2">
              Confirm Logout
            </h3>
            <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to logout from your account?
            </p>
            <div className="flex space-x-3">
              <button
                onClick={cancelLogout}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="lg:ml-64 min-h-screen flex flex-col">
        {/* Top Bar */}
        <header className={`shadow-sm sticky top-0 z-10 ${
          user?.userType === 'government'
            ? 'bg-blue-600 dark:bg-blue-800'
            : 'bg-white dark:bg-gray-800'
        }`}>
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className={`lg:hidden p-2 rounded-lg ${
                user?.userType === 'government'
                  ? 'text-white hover:bg-blue-500'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              <FaBars className="h-6 w-6" />
            </button>
            <div className="flex-1 lg:flex-none">
              <h1 className={`text-base sm:text-lg font-semibold text-center lg:text-left ${
                user?.userType === 'government'
                  ? 'text-white'
                  : 'text-gray-800 dark:text-white'
              }`}>
                {user?.userType === 'farmer' ? 'Farmer Dashboard' : 'NTPC Biomass Collection Portal'}
              </h1>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Mobile dark mode toggle */}
              <button
                onClick={toggleDarkMode}
                className={`p-2 rounded-lg lg:hidden ${
                  user?.userType === 'government'
                    ? 'text-white hover:bg-blue-500'
                    : 'text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                {darkMode ? <FaSun className="h-5 w-5" /> : <FaMoon className="h-5 w-5" />}
              </button>
              <div className={`text-sm hidden sm:block ${
                user?.userType === 'government'
                  ? 'text-blue-100'
                  : 'text-gray-500 dark:text-gray-400'
              }`}>
                Welcome, {user?.name}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-3 sm:p-4 lg:p-6">
          {children}
        </main>

        {/* Footer */}
        <footer className="py-4 px-6 text-center text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
          <p>&copy; {new Date().getFullYear()} Kisan App. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
