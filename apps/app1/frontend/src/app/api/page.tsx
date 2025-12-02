"use client";

import { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

// API endpoints data based on Arkesel's API documentation
const apiEndpoints = [
  {
    id: 'authentication',
    title: 'Authentication',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v2/sms/balance',
        description: 'Check your API key balance',
        request: `// No request body required. API key passed as a header parameter
// Header: api-key: YOUR_API_KEY`,
        response: `
{
  "status": "success",
  "message": "Balance retrieved successfully",
  "data": {
    "sms_balance": 500,
    "currency": "GHS"
  }
}`
      }
    ]
  },
  {
    id: 'messages',
    title: 'SMS Messages',
    endpoints: [
      {
        method: 'POST',
        path: '/api/v2/sms/send',
        description: 'Send SMS to single or multiple recipients',
        request: `
// Header: api-key: YOUR_API_KEY

{
  "sender": "Mas3ndi",
  "message": "Your verification code is 123456",
  "recipients": [
    "233201234567",
    "233207654321"
  ]
}`,
        response: `
{
  "status": "success",
  "data": {
    "message_id": "84de1a05-5442-48e5-b0a7-3ddd3e0a706c",
    "message": "Messages has been sent successfully",
    "status_code": "ok"
  }
}`
      },
      {
        method: 'POST',
        path: '/api/v2/sms/send/scheduled',
        description: 'Send scheduled SMS to be delivered at a later time',
        request: `
// Header: api-key: YOUR_API_KEY

{
  "sender": "Mas3ndi",
  "message": "Your appointment is tomorrow",
  "recipients": [
    "233201234567",
    "233207654321"
  ],
  "scheduled_date": "2025-06-30 14:30:00"
}`,
        response: `
{
  "status": "success",
  "data": {
    "message_id": "84de1a05-5442-48e5-b0a7-3ddd3e0a706c",
    "message": "Messages has been scheduled successfully",
    "status_code": "ok"
  }
}`
      },
      {
        method: 'POST',
        path: '/api/v2/sms/send/webhook',
        description: 'Send SMS with delivery webhook for status reports',
        request: `
// Header: api-key: YOUR_API_KEY

{
  "sender": "Mas3ndi",
  "message": "Your package has been shipped",
  "recipients": [
    "233201234567"
  ],
  "callback_url": "https://your-webhook-url.com/delivery-status"
}`,
        response: `
{
  "status": "success",
  "data": {
    "message_id": "84de1a05-5442-48e5-b0a7-3ddd3e0a706c",
    "message": "Messages has been sent successfully",
    "status_code": "ok"
  }
}`
      },
      {
        method: 'POST',
        path: '/api/v2/sms/send/sandbox',
        description: 'Send test SMS in sandbox mode (not billed)',
        request: `
// Header: api-key: YOUR_API_KEY

{
  "sender": "Mas3ndi",
  "message": "This is a test message",
  "recipients": [
    "233201234567"
  ]
}`,
        response: `
{
  "status": "success",
  "data": {
    "message_id": "sandbox-84de1a05-5442-48e5-b0a7-3ddd3e0a706c",
    "message": "Sandbox test successful",
    "status_code": "ok"
  }
}`
      }
    ]
  },
  {
    id: 'sender-ids',
    title: 'Sender IDs',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v2/sender-id/list',
        description: 'List all your registered sender IDs',
        request: `// No request body required. API key passed as a header parameter
// Header: api-key: YOUR_API_KEY`,
        response: `
{
  "status": "success",
  "message": "Sender IDs retrieved successfully",
  "data": {
    "sender_ids": [
      {
        "id": "sid_123456",
        "name": "Mas3ndi",
        "status": "approved",
        "created_at": "2025-05-15T10:20:30Z"
      },
      {
        "id": "sid_654321",
        "name": "ALERTS",
        "status": "pending",
        "created_at": "2025-06-01T14:25:36Z"
      }
    ]
  }
}`
      },
      {
        method: 'POST',
        path: '/api/v2/sender-id/register',
        description: 'Register a new sender ID',
        request: `
// Header: api-key: YOUR_API_KEY

{
  "sender_id": "Mas3ndi",
  "purpose": "Transactional messaging for our customers",
  "company_name": "Mas3ndi SMS Solutions"
}`,
        response: `
{
  "status": "success",
  "message": "Sender ID registration request submitted successfully",
  "data": {
    "id": "sid_789012",
    "name": "Mas3ndi",
    "status": "pending",
    "created_at": "2025-06-02T15:30:45Z"
  }
}`
      }
    ]
  },
  {
    id: 'account',
    title: 'Account & Wallet',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v2/account/profile',
        description: 'Get your account profile information',
        request: `// No request body required. API key passed as a header parameter
// Header: api-key: YOUR_API_KEY`,
        response: `
{
  "status": "success",
  "message": "Profile retrieved successfully",
  "data": {
    "user_id": "usr_12345",
    "company_name": "Mas3ndi SMS Solutions",
    "email": "contact@mas3ndi.com",
    "phone": "+233201234567",
    "account_type": "business",
    "created_at": "2025-01-15T08:30:00Z"
  }
}`
      },
      {
        method: 'GET',
        path: '/api/v2/sms/usage',
        description: 'Get your SMS usage statistics',
        request: `// No request body required. API key passed as a header parameter
// Header: api-key: YOUR_API_KEY`,
        response: `
{
  "status": "success",
  "message": "Usage statistics retrieved successfully",
  "data": {
    "total_sent": 1250,
    "delivered": 1230,
    "failed": 20,
    "pending": 0,
    "this_month": 450,
    "last_month": 800
  }
}`
      },
      {
        method: 'POST',
        path: '/api/v2/wallet/topup/request',
        description: 'Request a wallet top-up',
        request: `
// Header: api-key: YOUR_API_KEY

{
  "amount": 500,
  "payment_method": "mobile_money",
  "mobile_number": "233201234567",
  "network": "mtn"
}`,
        response: `
{
  "status": "success",
  "message": "Top-up request initiated successfully",
  "data": {
    "transaction_id": "txn_987654",
    "amount": 500,
    "status": "pending",
    "created_at": "2025-06-02T16:45:30Z"
  }
}`
      }
    ]
  }
];

export default function ApiReference() {
  const [activeCategory, setActiveCategory] = useState('authentication');
  
  return (
    <>
      <Navbar />
      <main className="pt-20 pb-16">
        {/* Hero Section */}
        <div className="bg-primary-700 text-white py-16">
          <div className="container-custom">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">API Reference</h1>
            <p className="text-xl opacity-90 max-w-2xl">
              Comprehensive documentation of Mas3ndi's SMS API endpoints, request formats, and responses.
            </p>
          </div>
        </div>
        
        {/* API Content */}
        <div className="container-custom py-12">
          <div className="flex flex-col lg:flex-row gap-10">
            {/* Sidebar Navigation */}
            <div className="lg:w-1/4 order-2 lg:order-1">
              <div className="sticky top-24 bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-100">
                  <h3 className="font-bold text-gray-800">API Endpoints</h3>
                </div>
                <nav className="p-4">
                  <ul className="space-y-3">
                    {apiEndpoints.map(category => (
                      <li key={category.id}>
                        <button
                          onClick={() => setActiveCategory(category.id)}
                          className={`text-left w-full py-2 px-3 rounded ${
                            activeCategory === category.id
                              ? 'bg-primary-50 text-primary-700 font-medium'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {category.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                </nav>
                
                {/* API Key Request */}
                <div className="p-4 mt-4 bg-gray-50 border-t border-gray-100">
                  <div className="text-center">
                    <h4 className="font-medium text-gray-800 mb-2">Need an API Key?</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Sign up for a developer account to get your API key and start integrating.
                    </p>
                    <Link 
                      href="/register" 
                      className="block w-full py-2 px-4 bg-primary-600 text-white text-sm font-medium rounded hover:bg-primary-700 transition-colors"
                    >
                      Request API Key
                    </Link>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Main Content */}
            <div className="lg:w-3/4 order-1 lg:order-2">
              {apiEndpoints
                .filter(category => category.id === activeCategory)
                .map(category => (
                  <div key={category.id} className="space-y-10">
                    <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                      <h2 className="text-2xl font-bold text-gray-800 mb-6">{category.title}</h2>
                      
                      {/* API Base Information */}
                      <div className="mb-8 p-4 bg-gray-50 rounded-lg">
                        <h3 className="font-medium text-gray-800 mb-2">Base URL</h3>
                        <div className="bg-gray-800 text-green-400 p-3 rounded font-mono text-sm">
                          https://api.mas3ndi.com/v1
                        </div>
                        <p className="mt-2 text-sm text-gray-600">
                          All API requests must include your API key in the Authorization header:
                        </p>
                        <div className="bg-gray-800 text-green-400 p-3 rounded font-mono text-sm mt-2">
                          Authorization: Bearer YOUR_API_KEY
                        </div>
                      </div>
                      
                      {/* Endpoints */}
                      <div className="space-y-10">
                        {category.endpoints.map((endpoint, index) => (
                          <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                            {/* Endpoint Header */}
                            <div className="flex items-center p-4 bg-gray-50 border-b border-gray-200">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                endpoint.method === 'GET' ? 'bg-blue-100 text-blue-700' :
                                endpoint.method === 'POST' ? 'bg-green-100 text-green-700' :
                                endpoint.method === 'PUT' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {endpoint.method}
                              </span>
                              <span className="font-mono text-sm ml-3">{endpoint.path}</span>
                            </div>
                            
                            {/* Endpoint Content */}
                            <div className="p-4">
                              <p className="text-gray-700 mb-4">{endpoint.description}</p>
                              
                              <div className="grid md:grid-cols-2 gap-4">
                                {/* Request */}
                                <div>
                                  <h4 className="font-medium text-gray-800 mb-2">Request</h4>
                                  <div className="bg-gray-800 text-green-400 p-3 rounded font-mono text-sm whitespace-pre overflow-x-auto">
                                    {endpoint.request}
                                  </div>
                                </div>
                                
                                {/* Response */}
                                <div>
                                  <h4 className="font-medium text-gray-800 mb-2">Response</h4>
                                  <div className="bg-gray-800 text-green-400 p-3 rounded font-mono text-sm whitespace-pre overflow-x-auto">
                                    {endpoint.response}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Getting Started */}
                    <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                      <h3 className="text-xl font-bold text-gray-800 mb-4">Getting Started with {category.title}</h3>
                      <p className="text-gray-700 mb-4">
                        To start using the {category.title.toLowerCase()} endpoints, you'll need to:
                      </p>
                      <ol className="list-decimal list-inside space-y-2 text-gray-700 mb-4">
                        <li>Obtain your API key from the dashboard</li>
                        <li>Include it in the Authorization header of your requests</li>
                        <li>Use the appropriate endpoint based on your needs</li>
                        <li>Handle the responses according to your application logic</li>
                      </ol>
                      <p className="text-gray-700 mb-4">
                        For more detailed guides and examples, check out our <Link href="/documentation" className="text-primary-600 hover:text-primary-700">documentation</Link>.
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
