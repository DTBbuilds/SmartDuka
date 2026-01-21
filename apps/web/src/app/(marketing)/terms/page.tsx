import type { Metadata } from 'next';
import Link from 'next/link';
import { Store } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terms of Service | SmartDuka',
  description: 'SmartDuka Terms of Service - The terms and conditions for using our POS and inventory management platform.',
  alternates: {
    canonical: 'https://smartduka.co.ke/terms',
  },
};

export default function TermsOfServicePage() {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Terms of Service</h1>
        
        <div className="prose prose-lg max-w-none">
          <p className="text-gray-600 mb-6">
            Last updated: January 2025
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">1. Acceptance of Terms</h2>
          <p className="text-gray-600 mb-6">
            By accessing or using SmartDuka&apos;s services, you agree to be bound by these Terms of Service. 
            If you do not agree to these terms, please do not use our services.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">2. Description of Service</h2>
          <p className="text-gray-600 mb-6">
            SmartDuka provides a cloud-based Point of Sale (POS) and inventory management platform 
            for retail businesses. Our services include sales processing, inventory tracking, 
            employee management, and business analytics.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">3. Account Registration</h2>
          <p className="text-gray-600 mb-6">
            You must provide accurate and complete information when creating an account. 
            You are responsible for maintaining the security of your account and password. 
            SmartDuka cannot and will not be liable for any loss or damage from your failure 
            to comply with this security obligation.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">4. Subscription and Payments</h2>
          <p className="text-gray-600 mb-6">
            SmartDuka offers various subscription plans. By subscribing, you agree to pay the 
            applicable fees. Fees are non-refundable except as required by law. We may change 
            our fees upon 30 days&apos; notice.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">5. Acceptable Use</h2>
          <p className="text-gray-600 mb-4">
            You agree not to:
          </p>
          <ul className="list-disc pl-6 text-gray-600 mb-6">
            <li>Use the service for any illegal purpose</li>
            <li>Attempt to gain unauthorized access to our systems</li>
            <li>Interfere with or disrupt the service</li>
            <li>Resell or redistribute the service without authorization</li>
            <li>Use the service to transmit harmful code or content</li>
          </ul>

          <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">6. Data Ownership</h2>
          <p className="text-gray-600 mb-6">
            You retain all rights to your business data. SmartDuka will not access, use, or 
            share your data except as necessary to provide the service or as required by law.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">7. Service Availability</h2>
          <p className="text-gray-600 mb-6">
            We strive for 99.9% uptime but do not guarantee uninterrupted service. We may 
            perform maintenance that temporarily affects service availability. We will 
            provide advance notice when possible.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">8. Limitation of Liability</h2>
          <p className="text-gray-600 mb-6">
            SmartDuka shall not be liable for any indirect, incidental, special, consequential, 
            or punitive damages resulting from your use of or inability to use the service.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">9. Termination</h2>
          <p className="text-gray-600 mb-6">
            Either party may terminate this agreement at any time. Upon termination, you may 
            export your data for 30 days. After this period, we may delete your data.
          </p>

          <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">10. Contact</h2>
          <p className="text-gray-600 mb-6">
            For questions about these Terms, contact us at:
            <br />
            Email: smartdukainfo@gmail.com
            <br />
            Phone: 0729983567 / 0104160502
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
