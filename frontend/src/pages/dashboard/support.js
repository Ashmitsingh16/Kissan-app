import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';
import { supportAPI } from '../../utils/api';
import toast from 'react-hot-toast';
import {
  FaHeadset,
  FaEnvelope,
  FaPhone,
  FaPaperPlane,
  FaTicketAlt,
  FaPlus,
  FaClock,
  FaCheckCircle,
  FaSpinner
} from 'react-icons/fa';

const SUPPORT_EMAIL = 'asshmit2005@gmail.com';
const HELPLINE_NUMBER = '1800-XXX-XXXX';

const categoryOptions = [
  { value: 'general', label: 'General Inquiry' },
  { value: 'payment', label: 'Payment Issue' },
  { value: 'appointment', label: 'Appointment/Booking' },
  { value: 'technical', label: 'Technical Problem' },
  { value: 'other', label: 'Other' }
];

const statusColors = {
  open: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  resolved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  closed: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
};

export default function Support() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');

  const [newTicket, setNewTicket] = useState({
    subject: '',
    message: '',
    category: 'general'
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchTickets();
    }
  }, [user]);

  const fetchTickets = async () => {
    try {
      const response = await supportAPI.getTickets();
      setTickets(response.data);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitTicket = async (e) => {
    e.preventDefault();

    if (!newTicket.subject.trim() || !newTicket.message.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setSubmitting(true);
    try {
      await supportAPI.createTicket(newTicket);
      toast.success('Support ticket created successfully! We will respond to your email.');
      setNewTicket({ subject: '', message: '', category: 'general' });
      setShowNewTicket(false);
      fetchTickets();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (ticketId) => {
    if (!replyMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setSubmitting(true);
    try {
      await supportAPI.replyToTicket(ticketId, replyMessage);
      toast.success('Reply sent successfully');
      setReplyMessage('');
      // Refresh the ticket
      const response = await supportAPI.getTicketById(ticketId);
      setSelectedTicket(response.data);
      fetchTickets();
    } catch (error) {
      toast.error('Failed to send reply');
    } finally {
      setSubmitting(false);
    }
  };

  const viewTicket = async (ticketId) => {
    try {
      const response = await supportAPI.getTicketById(ticketId);
      setSelectedTicket(response.data);
    } catch (error) {
      toast.error('Failed to load ticket details');
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center">
            <FaHeadset className="mr-3 text-primary-600" />
            Customer Support
          </h1>
          <p className="text-gray-600 dark:text-gray-300">Get help with your queries and issues</p>
        </div>
        <button
          onClick={() => setShowNewTicket(true)}
          className="mt-4 md:mt-0 btn-primary flex items-center"
        >
          <FaPlus className="mr-2" />
          New Support Ticket
        </button>
      </div>

      {/* Contact Info Cards */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="card bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border border-blue-200 dark:border-blue-700">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-200 dark:bg-blue-800 rounded-lg flex items-center justify-center mr-4">
              <FaEnvelope className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-blue-600 dark:text-blue-400">Email Support</p>
              <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-blue-800 dark:text-blue-300 hover:underline">
                {SUPPORT_EMAIL}
              </a>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border border-green-200 dark:border-green-700">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-200 dark:bg-green-800 rounded-lg flex items-center justify-center mr-4">
              <FaPhone className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-green-600 dark:text-green-400">Helpline (Toll-Free)</p>
              <p className="font-semibold text-green-800 dark:text-green-300">{HELPLINE_NUMBER}</p>
            </div>
          </div>
        </div>
      </div>

      {/* New Ticket Form */}
      {showNewTicket && (
        <div className="card mb-6 border-2 border-primary-200 dark:border-primary-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Create New Support Ticket</h2>
          <form onSubmit={handleSubmitTicket} className="space-y-4">
            <div>
              <label className="form-label">Category</label>
              <select
                value={newTicket.category}
                onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })}
                className="input-field"
              >
                {categoryOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Subject *</label>
              <input
                type="text"
                value={newTicket.subject}
                onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                className="input-field"
                placeholder="Brief description of your issue"
              />
            </div>

            <div>
              <label className="form-label">Message *</label>
              <textarea
                value={newTicket.message}
                onChange={(e) => setNewTicket({ ...newTicket, message: e.target.value })}
                className="input-field"
                rows={5}
                placeholder="Describe your issue in detail..."
              />
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={submitting}
                className={`btn-primary flex items-center ${submitting ? 'opacity-50' : ''}`}
              >
                {submitting ? (
                  <>
                    <FaSpinner className="animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <FaPaperPlane className="mr-2" />
                    Submit Ticket
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowNewTicket(false)}
                className="btn-outline"
              >
                Cancel
              </button>
            </div>
          </form>

          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-sm text-blue-700 dark:text-blue-300">
            <p>Your ticket will be sent to <strong>{SUPPORT_EMAIL}</strong></p>
            <p>You will receive a response via email within 24-48 hours.</p>
          </div>
        </div>
      )}

      {/* Tickets List */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center">
          <FaTicketAlt className="mr-2 text-gray-400 dark:text-gray-500" />
          Your Support Tickets
        </h2>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : tickets.length > 0 ? (
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <div
                key={ticket._id}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                onClick={() => viewTicket(ticket._id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium text-gray-800 dark:text-white">{ticket.subject}</h3>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${statusColors[ticket.status]}`}>
                        {ticket.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">{ticket.message}</p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-400 dark:text-gray-500">
                      <span className="capitalize">{ticket.category}</span>
                      <span className="flex items-center">
                        <FaClock className="mr-1" />
                        {new Date(ticket.createdAt).toLocaleDateString('en-IN')}
                      </span>
                      {ticket.replies?.length > 0 && (
                        <span>{ticket.replies.length} replies</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <FaTicketAlt className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No support tickets yet</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">Click "New Support Ticket" to create one</p>
          </div>
        )}
      </div>

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{selectedTicket.subject}</h3>
                  <div className="flex items-center space-x-3 mt-1">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${statusColors[selectedTicket.status]}`}>
                      {selectedTicket.status.replace('_', ' ')}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 capitalize">{selectedTicket.category}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(selectedTicket.createdAt).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 text-2xl leading-none"
                >
                  &times;
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-96">
              {/* Original Message */}
              <div className="mb-4">
                <div className="bg-primary-50 dark:bg-primary-900/30 rounded-lg p-4">
                  <p className="text-sm text-primary-600 dark:text-primary-400 mb-1">Your message:</p>
                  <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{selectedTicket.message}</p>
                </div>
              </div>

              {/* Replies */}
              {selectedTicket.replies && selectedTicket.replies.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-700 dark:text-gray-300">Conversation:</h4>
                  {selectedTicket.replies.map((reply, idx) => (
                    <div
                      key={idx}
                      className={`rounded-lg p-4 ${
                        reply.isAdmin ? 'bg-blue-50 dark:bg-blue-900/30 ml-4' : 'bg-gray-50 dark:bg-gray-700 mr-4'
                      }`}
                    >
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        {reply.isAdmin ? 'Support Team' : 'You'} - {new Date(reply.createdAt).toLocaleString('en-IN')}
                      </p>
                      <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{reply.message}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply Form */}
              {selectedTicket.status !== 'closed' && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <label className="form-label">Add a Reply</label>
                  <textarea
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    className="input-field"
                    rows={3}
                    placeholder="Type your message..."
                  />
                  <button
                    onClick={() => handleReply(selectedTicket._id)}
                    disabled={submitting}
                    className="mt-2 btn-primary"
                  >
                    {submitting ? 'Sending...' : 'Send Reply'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="mt-6 card bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700">
        <h3 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-3">Common Issues & FAQs</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium text-yellow-700 dark:text-yellow-400">Payment not received?</p>
            <p className="text-yellow-600 dark:text-yellow-500">Payments are processed within 7 working days after collection. Check your bank statement or create a ticket.</p>
          </div>
          <div>
            <p className="font-medium text-yellow-700 dark:text-yellow-400">How to cancel appointment?</p>
            <p className="text-yellow-600 dark:text-yellow-500">Go to Appointments page and click Cancel on pending appointments.</p>
          </div>
          <div>
            <p className="font-medium text-yellow-700 dark:text-yellow-400">Truck not arrived?</p>
            <p className="text-yellow-600 dark:text-yellow-500">Contact the driver using the phone number provided or create a support ticket.</p>
          </div>
          <div>
            <p className="font-medium text-yellow-700 dark:text-yellow-400">Wrong bank details?</p>
            <p className="text-yellow-600 dark:text-yellow-500">Update your bank details from the Bank Details page before booking appointments.</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
