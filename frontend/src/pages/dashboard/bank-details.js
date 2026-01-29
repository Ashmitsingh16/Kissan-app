import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';
import { authAPI } from '../../utils/api';
import toast from 'react-hot-toast';
import { FaUniversity, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';

// Demo mode - allows any random data for testing
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

export default function BankDetails() {
  const { user, loading: authLoading, updateUser } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [hasExistingDetails, setHasExistingDetails] = useState(false);

  const [formData, setFormData] = useState({
    accountNumber: '',
    confirmAccountNumber: '',
    ifscCode: '',
    bankName: '',
    accountHolderName: ''
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchBankDetails();
    }
  }, [user]);

  const fetchBankDetails = async () => {
    try {
      const response = await authAPI.getProfile();
      const bankDetails = response.data.bankDetails;

      if (bankDetails && bankDetails.accountNumber) {
        setFormData({
          accountNumber: bankDetails.accountNumber,
          confirmAccountNumber: bankDetails.accountNumber,
          ifscCode: bankDetails.ifscCode || '',
          bankName: bankDetails.bankName || '',
          accountHolderName: bankDetails.accountHolderName || ''
        });
        setHasExistingDetails(true);
      }
    } catch (error) {
      console.error('Error fetching bank details:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Auto-fetch bank name from IFSC code
  const handleIfscChange = async (e) => {
    const ifscCode = e.target.value.toUpperCase();
    setFormData(prev => ({ ...prev, ifscCode }));

    if (ifscCode.length === 11 && /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode)) {
      try {
        const response = await fetch(`https://ifsc.razorpay.com/${ifscCode}`);
        if (response.ok) {
          const data = await response.json();
          setFormData(prev => ({ ...prev, bankName: data.BANK }));
        }
      } catch (error) {
        console.error('Error fetching bank details:', error);
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.accountNumber.trim()) {
      newErrors.accountNumber = 'Account number is required';
    } else if (!DEMO_MODE && !/^\d{9,18}$/.test(formData.accountNumber)) {
      newErrors.accountNumber = 'Invalid account number (9-18 digits)';
    }

    if (formData.accountNumber !== formData.confirmAccountNumber) {
      newErrors.confirmAccountNumber = 'Account numbers do not match';
    }

    if (!formData.ifscCode.trim()) {
      newErrors.ifscCode = 'IFSC code is required';
    } else if (!DEMO_MODE && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifscCode)) {
      newErrors.ifscCode = 'Invalid IFSC code format';
    }

    if (!formData.bankName.trim()) {
      newErrors.bankName = 'Bank name is required';
    }

    if (!formData.accountHolderName.trim()) {
      newErrors.accountHolderName = 'Account holder name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      const { confirmAccountNumber, ...submitData } = formData;
      await authAPI.updateBankDetails(submitData);

      // Update local storage user data
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        userData.bankDetails = submitData;
        localStorage.setItem('user', JSON.stringify(userData));
        updateUser({ bankDetails: submitData });
      }

      setHasExistingDetails(true);
      toast.success('Bank details saved successfully!');
    } catch (error) {
      const message = error.response?.data?.message || error.response?.data?.errors?.[0]?.msg || 'Failed to save bank details';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Bank Details</h1>
        <p className="text-gray-600 dark:text-gray-400">Add your bank account details for receiving payments</p>
      </div>

      {/* Status Banner */}
      {hasExistingDetails ? (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg flex items-center">
          <FaCheckCircle className="h-6 w-6 text-green-600 dark:text-green-400 mr-3" />
          <div>
            <p className="font-medium text-green-800 dark:text-green-200">Bank details verified</p>
            <p className="text-sm text-green-600 dark:text-green-400">Your bank account is linked for receiving payments</p>
          </div>
        </div>
      ) : (
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg flex items-center">
          <FaExclamationCircle className="h-6 w-6 text-yellow-600 dark:text-yellow-400 mr-3" />
          <div>
            <p className="font-medium text-yellow-800 dark:text-yellow-200">Bank details required</p>
            <p className="text-sm text-yellow-600 dark:text-yellow-400">Please add your bank details to receive payments for straw selling</p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2">
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center">
              <FaUniversity className="mr-2 text-primary-600 dark:text-primary-400" />
              Bank Account Information
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="form-label">Account Holder Name *</label>
                <input
                  type="text"
                  name="accountHolderName"
                  value={formData.accountHolderName}
                  onChange={handleChange}
                  className={`input-field ${errors.accountHolderName ? 'border-red-500' : ''}`}
                  placeholder="Name as per bank account"
                />
                {errors.accountHolderName && <p className="error-text">{errors.accountHolderName}</p>}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Name should match exactly as in your bank account</p>
              </div>

              <div>
                <label className="form-label">Bank Account Number *</label>
                <input
                  type="text"
                  name="accountNumber"
                  value={formData.accountNumber}
                  onChange={handleChange}
                  className={`input-field ${errors.accountNumber ? 'border-red-500' : ''}`}
                  placeholder="Enter account number"
                  maxLength={18}
                />
                {errors.accountNumber && <p className="error-text">{errors.accountNumber}</p>}
              </div>

              <div>
                <label className="form-label">Confirm Account Number *</label>
                <input
                  type="text"
                  name="confirmAccountNumber"
                  value={formData.confirmAccountNumber}
                  onChange={handleChange}
                  className={`input-field ${errors.confirmAccountNumber ? 'border-red-500' : ''}`}
                  placeholder="Re-enter account number"
                  maxLength={18}
                />
                {errors.confirmAccountNumber && <p className="error-text">{errors.confirmAccountNumber}</p>}
              </div>

              <div>
                <label className="form-label">IFSC Code *</label>
                <input
                  type="text"
                  name="ifscCode"
                  value={formData.ifscCode}
                  onChange={handleIfscChange}
                  className={`input-field uppercase ${errors.ifscCode ? 'border-red-500' : ''}`}
                  placeholder="e.g., SBIN0001234"
                  maxLength={11}
                />
                {errors.ifscCode && <p className="error-text">{errors.ifscCode}</p>}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">11-character code found on your cheque book or passbook</p>
              </div>

              <div>
                <label className="form-label">Bank Name *</label>
                <input
                  type="text"
                  name="bankName"
                  value={formData.bankName}
                  onChange={handleChange}
                  className={`input-field ${errors.bankName ? 'border-red-500' : ''}`}
                  placeholder="e.g., State Bank of India"
                />
                {errors.bankName && <p className="error-text">{errors.bankName}</p>}
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className={`btn-primary w-full sm:w-auto ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {loading ? 'Saving...' : hasExistingDetails ? 'Update Bank Details' : 'Save Bank Details'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Info Panel */}
        <div className="lg:col-span-1">
          <div className="card bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-700">
            <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-3">Important Information</h3>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-2">
              <li className="flex items-start">
                <span className="w-1.5 h-1.5 bg-blue-500 dark:bg-blue-400 rounded-full mt-2 mr-2"></span>
                Bank account must be linked to your registered Aadhar card
              </li>
              <li className="flex items-start">
                <span className="w-1.5 h-1.5 bg-blue-500 dark:bg-blue-400 rounded-full mt-2 mr-2"></span>
                Payments are processed within 7 working days after verification
              </li>
              <li className="flex items-start">
                <span className="w-1.5 h-1.5 bg-blue-500 dark:bg-blue-400 rounded-full mt-2 mr-2"></span>
                Only savings accounts are accepted
              </li>
              <li className="flex items-start">
                <span className="w-1.5 h-1.5 bg-blue-500 dark:bg-blue-400 rounded-full mt-2 mr-2"></span>
                Ensure account details are accurate to avoid payment delays
              </li>
            </ul>
          </div>

          <div className="card mt-4">
            <h3 className="font-semibold text-gray-800 dark:text-white mb-3">Where to find IFSC Code?</h3>
            <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
              <li>- On your cheque book</li>
              <li>- On your bank passbook</li>
              <li>- Internet banking / mobile app</li>
              <li>- Bank's official website</li>
            </ul>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
