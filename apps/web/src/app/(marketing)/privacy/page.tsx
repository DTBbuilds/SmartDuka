import type { Metadata } from 'next';
import Link from 'next/link';
import { Store } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy | SmartDuka',
  description: 'SmartDuka Privacy Policy - Learn how we collect, use, and protect your data.',
  alternates: {
    canonical: 'https://smartduka.co.ke/privacy',
  },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Store className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">SmartDuka</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
        
        <div className="prose prose-lg max-w-none">
          <p className="text-gray-600 mb-6">
            Last updated: January 2025
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">1. Information We Collect</h2>
          <p className="text-gray-600 mb-4">
            We collect information you provide directly to us, such as when you create an account, 
            make a purchase, or contact us for support. This includes:
          </p>
          <ul className="list-disc pl-6 text-gray-600 mb-6">
            <li>Name and contact information</li>
            <li>Business details and address</li>
            <li>Payment information</li>
            <li>Transaction data</li>
            <li>Device and usage information</li>
          </ul>

          <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">2. How We Use Your Information</h2>
          <p className="text-gray-600 mb-4">
            We use the information we collect to:
          </p>
          <ul className="list-disc pl-6 text-gray-600 mb-6">
            <li>Provide and improve our services</li>
            <li>Process transactions and send related information</li>
            <li>Send technical notices and support messages</li>
            <li>Respond to your comments and questions</li>
            <li>Analyze usage patterns to improve user experience</li>
          </ul>

          <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">3. Data Security</h2>
          <p className="text-gray-600 mb-6">
            We implement appropriate security measures to protect your personal information. 
            Your data is encrypted in transit and at rest. We regularly review our security 
            practices and update them as necessary.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">4. Data Sharing</h2>
          <p className="text-gray-600 mb-6">
            We do not sell your personal information. We may share your information with 
            third-party service providers who assist us in operating our platform, conducting 
            our business, or servicing you, so long as those parties agree to keep this 
            information confidential.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">5. Your Rights</h2>
          <p className="text-gray-600 mb-6">
            You have the right to access, correct, or delete your personal information. 
            You can also object to processing of your personal information or request data portability.
            Contact us at privacy@smartduka.co.ke to exercise these rights.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">6. Contact Us</h2>
          <p className="text-gray-600 mb-6">
            If you have questions about this Privacy Policy, please contact us at:
            <br />
            Email: privacy@smartduka.co.ke
            <br />
            Phone: +254 700 000 000
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Store className="h-5 w-5 text-white" />
              </div>
              <span className="text-white font-semibold">SmartDuka</span>
            </Link>
            <p className="text-sm">© {new Date().getFullYear()} SmartDuka. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
