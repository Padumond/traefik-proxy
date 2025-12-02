"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';

export default function ReportsPage() {
  // State for active submenu tab
  const [activeSubMenu, setActiveSubMenu] = useState<string>('message-reports');
  
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
              <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
              <p className="text-sm text-gray-600 mt-1">View detailed analytics and message reports</p>
            </div>
          
            <div className="flex flex-col sm:flex-row gap-2">
              {/* Generate Report Button */}
              <button
                className="flex items-center px-4 py-2 bg-indigo-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Generate Report
              </button>
              
              <div className="relative">
                <button
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                >
                  <svg className="-ml-1 mr-2 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Submenu Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Report features">
            <button
              className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeSubMenu === 'message-reports' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              onClick={() => setActiveSubMenu('message-reports')}
            >
              Message Reports
            </button>
            <button
              className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeSubMenu === 'usage-analytics' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              onClick={() => setActiveSubMenu('usage-analytics')}
            >
              Usage Analytics
            </button>
            <button
              className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeSubMenu === 'financial-reports' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              onClick={() => setActiveSubMenu('financial-reports')}
            >
              Financial Reports
            </button>
            <button
              className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeSubMenu === 'delivery-reports' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              onClick={() => setActiveSubMenu('delivery-reports')}
            >
              Delivery Reports
            </button>
          </nav>
        </div>

        {/* Placeholder Content */}
        <div className="bg-white shadow-sm rounded-lg p-6 border border-gray-200">
          {activeSubMenu === 'message-reports' && (
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Message Reports</h2>
              <p className="text-gray-600">View detailed reports on your message sending history and performance.</p>
              <div className="h-40 flex items-center justify-center border border-dashed border-gray-300 rounded-lg mt-4">
                <p className="text-gray-500">Message reports will appear here</p>
              </div>
            </div>
          )}
          
          {activeSubMenu === 'usage-analytics' && (
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Usage Analytics</h2>
              <p className="text-gray-600">View analytics about your SMS usage patterns and trends.</p>
              <div className="h-40 flex items-center justify-center border border-dashed border-gray-300 rounded-lg mt-4">
                <p className="text-gray-500">Usage analytics charts will appear here</p>
              </div>
            </div>
          )}
          
          {activeSubMenu === 'financial-reports' && (
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Financial Reports</h2>
              <p className="text-gray-600">View reports on your spending and credits.</p>
              <div className="h-40 flex items-center justify-center border border-dashed border-gray-300 rounded-lg mt-4">
                <p className="text-gray-500">Financial reports will appear here</p>
              </div>
            </div>
          )}

          {activeSubMenu === 'delivery-reports' && (
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Delivery Reports</h2>
              <p className="text-gray-600">View detailed delivery statistics and performance.</p>
              <div className="h-40 flex items-center justify-center border border-dashed border-gray-300 rounded-lg mt-4">
                <p className="text-gray-500">Delivery reports and statistics will appear here</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
