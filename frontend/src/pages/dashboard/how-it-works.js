import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';
import {
  FaTractor,
  FaSeedling,
  FaCalendarAlt,
  FaTruck,
  FaMoneyBillWave,
  FaCheckCircle,
  FaArrowRight,
  FaLeaf,
  FaPhone,
  FaQuestionCircle
} from 'react-icons/fa';

const steps = [
  {
    number: 1,
    title: 'Register Your Farm',
    description: 'Add your farm details including location, area, soil type, and irrigation facilities. This helps us understand your farming setup better.',
    icon: FaTractor,
    color: 'bg-green-500',
    link: '/dashboard/farms/new',
    linkText: 'Register Farm'
  },
  {
    number: 2,
    title: 'Add Your Crops',
    description: 'Track all your crops with sowing dates, expected harvest dates, and crop types. This helps predict when your straw will be ready for collection.',
    icon: FaSeedling,
    color: 'bg-yellow-500',
    link: '/dashboard/farms',
    linkText: 'View Farms'
  },
  {
    number: 3,
    title: 'Book Straw Collection',
    description: 'When your harvest is complete, book an appointment for straw collection. Select your preferred date and time slot for pickup.',
    icon: FaCalendarAlt,
    color: 'bg-blue-500',
    link: '/dashboard/appointments/new',
    linkText: 'Book Appointment'
  },
  {
    number: 4,
    title: 'Truck Arrives',
    description: 'Our collection truck will arrive at your farm on the scheduled date. You will receive SMS and email notifications with driver details.',
    icon: FaTruck,
    color: 'bg-purple-500'
  },
  {
    number: 5,
    title: 'Straw Collection & Weighing',
    description: 'The straw is collected and weighed at our weighbridge. Quality is assessed and graded (A, B, or C) based on moisture and cleanliness.',
    icon: FaCheckCircle,
    color: 'bg-indigo-500'
  },
  {
    number: 6,
    title: 'Receive Payment',
    description: 'Payment is processed directly to your registered bank account within 3-5 working days. Track payment status in your appointments.',
    icon: FaMoneyBillWave,
    color: 'bg-green-600',
    link: '/dashboard/bank-details',
    linkText: 'Update Bank Details'
  }
];

const benefits = [
  'No more burning straw - sell it instead!',
  'Fair pricing based on quality and weight',
  'Direct bank transfer - no cash handling',
  'Track everything from your phone',
  'Contribute to clean energy production',
  'Help reduce air pollution'
];

const faqs = [
  {
    question: 'What types of straw do you collect?',
    answer: 'We collect straw from wheat, rice, sugarcane, maize, and other major crops. All crop residues are accepted.'
  },
  {
    question: 'How is the price calculated?',
    answer: 'Price is based on weight and quality grade. Grade A: Rs 220/quintal, Grade B: Rs 200/quintal, Grade C: Rs 180/quintal.'
  },
  {
    question: 'When will I receive payment?',
    answer: 'Payments are processed within 3-5 working days after collection and are transferred directly to your bank account.'
  },
  {
    question: 'What if I need to cancel my appointment?',
    answer: 'You can cancel your appointment from the Appointments section as long as it hasnt been collected yet.'
  }
];

export default function HowItWorks() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

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
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 dark:from-primary-600 dark:to-primary-700 rounded-xl p-6 mb-6 text-white">
        <div className="flex items-center space-x-3 mb-2">
          <FaLeaf className="h-8 w-8" />
          <h1 className="text-2xl font-bold">How Kisan App Works</h1>
        </div>
        <p className="opacity-90">
          Learn how to sell your crop straw and earn money while helping the environment
        </p>
      </div>

      {/* Steps */}
      <div className="card mb-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6">Step-by-Step Process</h2>
        <div className="space-y-6">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-start space-x-4">
              <div className={`flex-shrink-0 w-12 h-12 ${step.color} rounded-full flex items-center justify-center text-white`}>
                <step.icon className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Step {step.number}</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">{step.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-2">{step.description}</p>
                {step.link && (
                  <Link
                    href={step.link}
                    className="inline-flex items-center text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm font-medium"
                  >
                    {step.linkText}
                    <FaArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                )}
              </div>
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute left-6 mt-12 w-0.5 h-8 bg-gray-200 dark:bg-gray-700"></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Benefits */}
      <div className="card mb-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Benefits of Using Kisan App</h2>
        <div className="grid md:grid-cols-2 gap-3">
          {benefits.map((benefit, index) => (
            <div key={index} className="flex items-center space-x-3 p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
              <FaCheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
              <span className="text-gray-800 dark:text-gray-200">{benefit}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing Info */}
      <div className="card mb-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Pricing Information</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-700 text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">Rs 220</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">per quintal</div>
            <div className="mt-2 px-3 py-1 bg-green-600 text-white rounded-full text-sm inline-block">Grade A</div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Dry, clean, no moisture</p>
          </div>
          <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700 text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">Rs 200</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">per quintal</div>
            <div className="mt-2 px-3 py-1 bg-blue-600 text-white rounded-full text-sm inline-block">Grade B</div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Slight moisture</p>
          </div>
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg border border-yellow-200 dark:border-yellow-700 text-center">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mb-1">Rs 180</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">per quintal</div>
            <div className="mt-2 px-3 py-1 bg-yellow-600 text-white rounded-full text-sm inline-block">Grade C</div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Higher moisture/debris</p>
          </div>
        </div>
      </div>

      {/* FAQs */}
      <div className="card mb-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
          <FaQuestionCircle className="inline mr-2" />
          Frequently Asked Questions
        </h2>
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <h3 className="font-semibold text-gray-800 dark:text-white mb-2">{faq.question}</h3>
              <p className="text-gray-600 dark:text-gray-400">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Support */}
      <div className="card bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700">
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
            <FaPhone className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-blue-800 dark:text-blue-200">Need Help?</h3>
            <p className="text-blue-700 dark:text-blue-300">Contact our support team at 1800-XXX-XXXX (Toll Free)</p>
            <Link href="/dashboard/support" className="text-blue-600 dark:text-blue-400 text-sm font-medium hover:underline">
              Or visit Support Page
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
