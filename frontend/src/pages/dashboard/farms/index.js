import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import DashboardLayout from '../../../components/DashboardLayout';
import { farmAPI } from '../../../utils/api';
import toast from 'react-hot-toast';
import {
  FaTractor,
  FaPlus,
  FaMapMarkerAlt,
  FaSeedling,
  FaTrash,
  FaEdit,
  FaEye
} from 'react-icons/fa';

export default function Farms() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    } else if (user?.userType !== 'farmer') {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user?.userType === 'farmer') {
      fetchFarms();
    }
  }, [user]);

  const fetchFarms = async () => {
    try {
      const response = await farmAPI.getAll();
      setFarms(response.data);
    } catch (error) {
      console.error('Error fetching farms:', error);
      toast.error('Failed to load farms');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (farmId) => {
    if (!confirm('Are you sure you want to delete this farm?')) return;

    try {
      await farmAPI.delete(farmId);
      setFarms(farms.filter(f => f._id !== farmId));
      toast.success('Farm deleted successfully');
    } catch (error) {
      toast.error('Failed to delete farm');
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">My Farms</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your registered farms</p>
        </div>
        <Link href="/dashboard/farms/new" className="btn-primary mt-4 sm:mt-0 inline-flex items-center">
          <FaPlus className="mr-2" />
          Register New Farm
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      ) : farms.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {farms.map((farm) => (
            <div key={farm._id} className="card hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/50 rounded-lg flex items-center justify-center">
                  <FaTractor className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                </div>
                <div className="flex space-x-2">
                  <Link href={`/dashboard/farms/${farm._id}`} className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded">
                    <FaEye />
                  </Link>
                  <Link href={`/dashboard/farms/${farm._id}/edit`} className="p-2 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/30 rounded">
                    <FaEdit />
                  </Link>
                  <button onClick={() => handleDelete(farm._id)} className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded">
                    <FaTrash />
                  </button>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">{farm.farmName}</h3>

              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <div className="flex items-center">
                  <FaMapMarkerAlt className="mr-2 text-gray-400 dark:text-gray-500" />
                  {farm.location?.village ? `${farm.location.village}, ` : ''}
                  {farm.location?.district}, {farm.location?.state}
                </div>
                <div className="flex items-center">
                  <FaSeedling className="mr-2 text-gray-400 dark:text-gray-500" />
                  {farm.totalArea} {farm.areaUnit}
                </div>
              </div>

              {/* Crops Summary */}
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Crops: {farm.crops?.length || 0}</span>
                  <Link href={`/dashboard/farms/${farm._id}/crops`} className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300">
                    Manage Crops
                  </Link>
                </div>
                {farm.crops?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {farm.crops.slice(0, 3).map((crop, idx) => (
                      <span key={idx} className={`px-2 py-1 text-xs rounded-full ${
                        crop.status === 'growing' ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' :
                        crop.status === 'ready_to_harvest' ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300' :
                        crop.status === 'harvested' ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' :
                        'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}>
                        {crop.cropName}
                      </span>
                    ))}
                    {farm.crops.length > 3 && (
                      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        +{farm.crops.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Soil & Irrigation Info */}
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400">
                {farm.soilType && (
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded px-2 py-1">
                    Soil: {farm.soilType}
                  </div>
                )}
                {farm.irrigationType && (
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded px-2 py-1">
                    Irrigation: {farm.irrigationType}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <FaTractor className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-2">No Farms Registered</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Register your first farm to start tracking your crops and sell straw</p>
          <Link href="/dashboard/farms/new" className="btn-primary inline-block">
            Register Your First Farm
          </Link>
        </div>
      )}
    </DashboardLayout>
  );
}
