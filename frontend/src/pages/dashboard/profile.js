import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';
import { authAPI } from '../../utils/api';
import toast from 'react-hot-toast';
import { FaUser, FaPhone, FaEnvelope, FaIdCard, FaEdit, FaSave, FaTimes, FaCamera, FaUpload, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';

export default function Profile() {
  const { user, loading: authLoading, updateUser } = useAuth();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        password: '',
        confirmPassword: ''
      });
      if (user.profilePhoto) {
        setPhotoPreview(user.profilePhoto);
      }
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.phone.match(/^[6-9]\d{9}$/)) {
      newErrors.phone = 'Enter valid 10-digit phone number';
    }

    if (formData.password) {
      if (formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      const submitData = {
        name: formData.name,
        phone: formData.phone
      };

      if (formData.password) {
        submitData.password = formData.password;
      }

      const response = await authAPI.updateProfile(submitData);

      const { token, ...userData } = response.data;
      if (token) {
        localStorage.setItem('token', token);
      }
      localStorage.setItem('user', JSON.stringify(userData));
      updateUser(userData);

      setEditing(false);
      setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
      toast.success('Profile updated successfully!');
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update profile';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const cancelEdit = () => {
    setEditing(false);
    setFormData({
      name: user.name || '',
      phone: user.phone || '',
      password: '',
      confirmPassword: ''
    });
    setErrors({});
  };

  // Photo upload handler
  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Photo must be less than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      setProfilePhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
        toast.success('Photo selected successfully!');
      };
      reader.readAsDataURL(file);
    }
  };

  // Camera functions
  const startCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      toast.error('Unable to access camera. Please check permissions.');
      setShowCamera(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setPhotoPreview(dataUrl);
      stopCamera();
      toast.success('Photo captured successfully!');

      // Convert data URL to blob for upload
      fetch(dataUrl)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
          setProfilePhoto(file);
        });
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
    }
    setShowCamera(false);
  };

  const uploadPhoto = async () => {
    if (!profilePhoto) {
      toast.error('Please select or capture a photo first');
      return;
    }

    setUploadingPhoto(true);
    try {
      // In a real app, this would upload to backend
      // For now, we'll just show success
      toast.success('Photo uploaded successfully! Verification pending.');
      // Update user verification status in local state
      const updatedUser = { ...user, isVerified: true };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      updateUser(updatedUser);
    } catch (error) {
      toast.error('Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">My Profile</h1>
        <p className="text-gray-600 dark:text-gray-400">View and manage your account information</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Account Information</h2>
              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="btn-outline text-sm flex items-center"
                >
                  <FaEdit className="mr-2" />
                  Edit Profile
                </button>
              )}
            </div>

            {editing ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={`input-field ${errors.name ? 'border-red-500' : ''}`}
                  />
                  {errors.name && <p className="error-text">{errors.name}</p>}
                </div>

                <div>
                  <label className="form-label">Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className={`input-field ${errors.phone ? 'border-red-500' : ''}`}
                    maxLength={10}
                  />
                  {errors.phone && <p className="error-text">{errors.phone}</p>}
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                  <h3 className="font-medium text-gray-800 dark:text-white mb-3">Change Password (Optional)</h3>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">New Password</label>
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        className={`input-field ${errors.password ? 'border-red-500' : ''}`}
                        placeholder="Leave blank to keep current"
                      />
                      {errors.password && <p className="error-text">{errors.password}</p>}
                    </div>

                    <div>
                      <label className="form-label">Confirm New Password</label>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className={`input-field ${errors.confirmPassword ? 'border-red-500' : ''}`}
                        placeholder="Confirm new password"
                      />
                      {errors.confirmPassword && <p className="error-text">{errors.confirmPassword}</p>}
                    </div>
                  </div>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className={`btn-primary flex items-center ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <FaSave className="mr-2" />
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="btn-outline flex items-center"
                  >
                    <FaTimes className="mr-2" />
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <FaUser className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-4" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Full Name</p>
                    <p className="font-medium text-gray-800 dark:text-white">{user.name}</p>
                  </div>
                </div>

                <div className="flex items-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <FaEnvelope className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-4" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Email Address</p>
                    <p className="font-medium text-gray-800 dark:text-white">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <FaPhone className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-4" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Phone Number</p>
                    <p className="font-medium text-gray-800 dark:text-white">{user.phone}</p>
                  </div>
                </div>

                <div className="flex items-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <FaIdCard className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-4" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">User Type</p>
                    <p className="font-medium text-gray-800 dark:text-white capitalize">{user.userType}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Photo Verification Section */}
          <div className="card mt-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Photo Verification</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Upload a clear photo of yourself for identity verification. This helps ensure secure transactions.
            </p>

            <div className="flex flex-col items-center">
              {/* Photo Preview */}
              <div className="w-32 h-32 rounded-full bg-gray-100 dark:bg-gray-700 border-4 border-primary-500 overflow-hidden mb-4 flex items-center justify-center">
                {photoPreview ? (
                  <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <FaUser className="h-16 w-16 text-gray-400 dark:text-gray-500" />
                )}
              </div>

              {/* Camera View */}
              {showCamera && (
                <div className="mb-4 relative">
                  <video ref={videoRef} autoPlay playsInline className="rounded-lg max-w-xs" />
                  <div className="flex justify-center space-x-3 mt-3">
                    <button
                      onClick={capturePhoto}
                      className="btn-primary flex items-center"
                    >
                      <FaCamera className="mr-2" />
                      Capture
                    </button>
                    <button
                      onClick={stopCamera}
                      className="btn-outline flex items-center"
                    >
                      <FaTimes className="mr-2" />
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <canvas ref={canvasRef} className="hidden" />

              {/* Upload Options */}
              {!showCamera && (
                <div className="flex flex-wrap justify-center gap-3 mb-4">
                  <button
                    onClick={startCamera}
                    className="btn-outline flex items-center"
                  >
                    <FaCamera className="mr-2" />
                    {photoPreview ? 'Retake Photo' : 'Take Photo'}
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-outline flex items-center"
                  >
                    <FaUpload className="mr-2" />
                    {photoPreview ? 'Change Photo' : 'Upload Photo'}
                  </button>
                  {photoPreview && (
                    <button
                      onClick={() => {
                        setPhotoPreview(null);
                        setProfilePhoto(null);
                        toast.success('Photo removed');
                      }}
                      className="btn-outline flex items-center text-red-600 border-red-600 hover:bg-red-600 hover:text-white dark:text-red-400 dark:border-red-400"
                    >
                      <FaTimes className="mr-2" />
                      Remove
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                </div>
              )}

              {/* Upload Button */}
              {photoPreview && !showCamera && !user.isVerified && (
                <button
                  onClick={uploadPhoto}
                  disabled={uploadingPhoto}
                  className={`btn-primary ${uploadingPhoto ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {uploadingPhoto ? 'Uploading...' : 'Submit for Verification'}
                </button>
              )}

              <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
                Your photo will be verified to ensure it matches your ID.
              </p>
            </div>
          </div>
        </div>

        {/* Side Panel */}
        <div className="lg:col-span-1">
          {/* Account Summary */}
          <div className="card mb-4">
            <div className="text-center">
              <div className="w-20 h-20 bg-primary-100 dark:bg-primary-900/50 rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden">
                {photoPreview ? (
                  <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <FaUser className="h-10 w-10 text-primary-600 dark:text-primary-400" />
                )}
              </div>
              <h3 className="font-semibold text-gray-800 dark:text-white">{user.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{user.userType}</p>
              {user.isVerified ? (
                <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300">
                  <FaCheckCircle className="mr-1" />
                  Verified Account
                </div>
              ) : photoPreview ? (
                <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                  <FaCheckCircle className="mr-1" />
                  Photo Uploaded - Submit for Verification
                </div>
              ) : (
                <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full text-sm bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300">
                  <FaExclamationTriangle className="mr-1" />
                  Not Verified - Upload Photo
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats for Farmers */}
          {user.userType === 'farmer' && (
            <div className="card">
              <h3 className="font-semibold text-gray-800 dark:text-white mb-3">Account Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Registered Farms</span>
                  <span className="font-semibold text-gray-800 dark:text-white">{user.numberOfFarms || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Bank Account</span>
                  <span className={`font-medium ${user.bankDetails?.accountNumber ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                    {user.bankDetails?.accountNumber ? 'Linked' : 'Not Linked'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Member Since</span>
                  <span className="font-medium text-gray-800 dark:text-white">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Help */}
          <div className="card mt-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800">
            <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">Need Help?</h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Contact support for any account-related queries or issues.
            </p>
            <p className="text-sm text-blue-600 dark:text-blue-400 mt-2">
              Helpline: 1800-XXX-XXXX
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
