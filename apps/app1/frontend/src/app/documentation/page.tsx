"use client";

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

// Define the documentation structure - keep original structure
const docSections = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    topics: [
      { id: 'introduction', title: 'Introduction to Mas3ndi' },
      { id: 'account-setup', title: 'Account Setup' },
      { id: 'dashboard-overview', title: 'Dashboard Overview' }
    ]
  },
  {
    id: 'sms-gateway',
    title: 'SMS Gateway',
    topics: [
      { id: 'sending-sms', title: 'Sending SMS' },
      { id: 'bulk-messaging', title: 'Bulk Messaging' },
      { id: 'delivery-reports', title: 'Delivery Reports' }
    ]
  },
  {
    id: 'wallet-billing',
    title: 'Wallet & Billing',
    topics: [
      { id: 'pricing', title: 'Pricing' },
      { id: 'wallet-management', title: 'Wallet Management' },
      { id: 'invoices', title: 'Invoices & Receipts' }
    ]
  }
];

export default function Documentation() {
  const [activeSection, setActiveSection] = useState('getting-started');
  const [activeTopic, setActiveTopic] = useState('introduction');
  
  // Helper function to determine if a section is active
  const isSectionActive = (sectionId: string) => {
    return activeSection === sectionId;
  };
  
  // Helper function to determine if a topic is active
  const isTopicActive = (topicId: string) => {
    return activeTopic === topicId;
  };
  
  return (
    <>
      <Navbar />
      <main className="pt-20 pb-16">
        {/* Hero Section */}
        <div className="bg-primary-700 text-white py-16">
          <div className="container-custom">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Documentation</h1>
            <p className="text-xl opacity-90 max-w-2xl">
              Comprehensive guides to help you get the most out of Mas3ndi's SMS platform.
            </p>
          </div>
        </div>
        
        {/* Documentation Content */}
        <div className="container-custom py-12">
          <div className="flex flex-col lg:flex-row gap-10">
            {/* Sidebar */}
            <div className="lg:w-1/4">
              <div className="sticky top-24">
                <h2 className="text-xl font-semibold mb-6 text-gray-800">Documentation</h2>
                <div className="space-y-6">
                  {docSections.map((section) => (
                    <div key={section.id} className="space-y-2">
                      <button
                        onClick={() => {
                          setActiveSection(section.id);
                          setActiveTopic(section.topics[0].id);
                        }}
                        className={`flex items-center justify-between w-full text-left font-medium ${
                          isSectionActive(section.id) ? 'text-primary-600' : 'text-gray-700'
                        }`}
                      >
                        <span>{section.title}</span>
                        <svg
                          className={`w-5 h-5 transition-transform ${
                            isSectionActive(section.id) ? 'transform rotate-180' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      {isSectionActive(section.id) && (
                        <div className="pl-4 border-l-2 border-gray-200 space-y-2">
                          {section.topics.map((topic) => (
                            <button
                              key={topic.id}
                              onClick={() => setActiveTopic(topic.id)}
                              className={`block w-full text-left ${
                                isTopicActive(topic.id) ? 'text-primary-600 font-medium' : 'text-gray-600'
                              }`}
                            >
                              {topic.title}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Main Content */}
            <div className="lg:w-3/4">
              {/* Getting Started - Account Setup - Fund Your Wallet Section */}
              {activeSection === 'getting-started' && activeTopic === 'account-setup' && (
                <div>
                  <h2 className="text-3xl font-bold text-gray-800 mb-6">Account Setup</h2>
                  
                  <div className="prose prose-lg max-w-none mb-10">
                    <p>Setting up your Mas3ndi account is simple and straightforward. Follow these steps to get started with our SMS platform.</p>
                  </div>
                  
                  <div className="space-y-12 mb-12">
                    {/* Fund Your Wallet Section - With Updated Payment Methods Layout */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                      <div className="flex items-center mb-4">
                        <div className="bg-primary-100 p-3 rounded-full mr-4">
                          <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900">Fund Your Wallet</h3>
                          <p className="text-gray-600">Add credits to your account to start sending messages.</p>
                        </div>
                      </div>
                      
                      <div className="pl-16">
                        <p className="text-gray-700 mb-4">Choose your preferred payment method to add credits to your wallet. All transactions are secure and processed instantly.</p>
                        
                        {/* Updated Payment Methods - Horizontal Cards Stacked Vertically */}
                        <div className="flex flex-col gap-4 mb-4">
                          <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all duration-300 flex items-center">
                            <div className="bg-primary-50 rounded-lg p-4 mr-4">
                              <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <div className="text-left">
                              <div className="font-medium text-gray-900 mb-1">Mobile Money</div>
                              <p className="text-sm text-gray-600">MTN, Vodafone, AirtelTigo</p>
                            </div>
                          </div>
                          
                          <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all duration-300 flex items-center">
                            <div className="bg-primary-50 rounded-lg p-4 mr-4">
                              <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                              </svg>
                            </div>
                            <div className="text-left">
                              <div className="font-medium text-gray-900 mb-1">Bank Transfer</div>
                              <p className="text-sm text-gray-600">Direct bank deposits</p>
                            </div>
                          </div>
                          
                          <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all duration-300 flex items-center">
                            <div className="bg-primary-50 rounded-lg p-4 mr-4">
                              <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                              </svg>
                            </div>
                            <div className="text-left">
                              <div className="font-medium text-gray-900 mb-1">Credit Card</div>
                              <p className="text-sm text-gray-600">Visa, Mastercard</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center mt-2 text-sm text-gray-700">
                        <svg className="w-5 h-5 text-primary-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Credits are added to your account immediately after payment confirmation.</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Placeholder for other content sections */}
              {!(activeSection === 'getting-started' && activeTopic === 'account-setup') && (
                <div className="bg-gray-50 p-10 rounded-lg border border-dashed border-gray-300 text-center">
                  <h3 className="text-xl text-gray-600">
                    Content for {activeSection} - {activeTopic} section
                  </h3>
                  <p className="mt-2 text-gray-500">This section content is not currently displayed in this simplified version.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
