"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';

export default function SupportPage() {
  // State for active submenu tab
  const [activeSubMenu, setActiveSubMenu] = useState<string>('tickets');
  
  return (
    <div className="space-y-6">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Support</h1>
              <p className="text-sm text-gray-600 mt-1">Get help and contact our support team</p>
            </div>
          
            <div className="flex flex-col sm:flex-row gap-2">
              {/* Create Ticket Button */}
              <button
                className="flex items-center px-4 py-2 bg-indigo-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                </svg>
                Create Ticket
              </button>
            </div>
          </div>
        </div>
        
        {/* Submenu Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Support features">
            <button
              className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeSubMenu === 'tickets' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              onClick={() => setActiveSubMenu('tickets')}
            >
              Support Tickets
            </button>
            <button
              className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeSubMenu === 'faqs' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              onClick={() => setActiveSubMenu('faqs')}
            >
              FAQs
            </button>
            <button
              className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeSubMenu === 'documentation' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              onClick={() => setActiveSubMenu('documentation')}
            >
              Documentation
            </button>
            <button
              className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeSubMenu === 'contact' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              onClick={() => setActiveSubMenu('contact')}
            >
              Contact Us
            </button>
          </nav>
        </div>

        {/* Placeholder Content */}
        <div className="bg-white shadow-sm rounded-lg p-6 border border-gray-200">
          {activeSubMenu === 'tickets' && (
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Support Tickets</h2>
              <p className="text-gray-600">View and manage your support tickets.</p>
              <div className="h-40 flex items-center justify-center border border-dashed border-gray-300 rounded-lg mt-4">
                <p className="text-gray-500">Support tickets will appear here</p>
              </div>
            </div>
          )}
          
          {activeSubMenu === 'faqs' && (
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Frequently Asked Questions</h2>
              <p className="text-gray-600">Find answers to common questions about our services.</p>
              <div className="h-40 flex items-center justify-center border border-dashed border-gray-300 rounded-lg mt-4">
                <p className="text-gray-500">FAQs will appear here</p>
              </div>
            </div>
          )}
          
          {activeSubMenu === 'documentation' && (
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Documentation</h2>
              <p className="text-gray-600">Access our comprehensive documentation and guides.</p>
              <div className="h-40 flex items-center justify-center border border-dashed border-gray-300 rounded-lg mt-4">
                <p className="text-gray-500">Documentation will appear here</p>
              </div>
            </div>
          )}

          {activeSubMenu === 'contact' && (
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Contact Us</h2>
              <p className="text-gray-600">Reach out to our support team directly.</p>
              <div className="h-40 flex items-center justify-center border border-dashed border-gray-300 rounded-lg mt-4">
                <p className="text-gray-500">Contact form will appear here</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
