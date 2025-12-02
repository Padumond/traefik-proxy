const axios = require('axios');

// Quick test for sender ID validation
const BASE_URL = 'http://localhost:3000';

// Test cases for sender ID validation
const testCases = [
  {
    name: 'Missing sender ID',
    payload: {
      to: '+233123456789',
      message: 'Test message without sender ID'
    },
    expectedError: 'MISSING_SENDER_ID',
    description: 'Should reject requests without sender ID'
  },
  {
    name: 'Invalid sender ID format (too short)',
    payload: {
      to: '+233123456789',
      message: 'Test message with invalid sender',
      from: '12'
    },
    expectedError: 'INVALID_SENDER_ID_FORMAT',
    description: 'Should reject sender IDs shorter than 3 characters'
  },
  {
    name: 'Invalid sender ID format (too long)',
    payload: {
      to: '+233123456789',
      message: 'Test message with invalid sender',
      from: 'ThisSenderIdIsTooLong'
    },
    expectedError: 'INVALID_SENDER_ID_FORMAT',
    description: 'Should reject sender IDs longer than 11 characters'
  },
  {
    name: 'Invalid sender ID format (special characters)',
    payload: {
      to: '+233123456789',
      message: 'Test message with invalid sender',
      from: 'Test@123'
    },
    expectedError: 'INVALID_SENDER_ID_FORMAT',
    description: 'Should reject sender IDs with special characters'
  },
  {
    name: 'Valid format but unapproved sender ID',
    payload: {
      to: '+233123456789',
      message: 'Test message with unapproved sender',
      from: 'TestSend'
    },
    expectedError: 'INVALID_SENDER_ID',
    description: 'Should reject valid format but unapproved sender IDs'
  }
];

async function testSenderIdValidation() {
  console.log('🧪 Testing Sender ID Validation Logic');
  console.log('=' * 50);
  
  // You'll need to replace this with a valid API key from your system
  const API_KEY = 'your-test-api-key-here';
  
  if (API_KEY === 'your-test-api-key-here') {
    console.log('❌ Please update the API_KEY in this script with a valid API key');
    console.log('   You can generate one through the admin panel or API');
    return;
  }

  let passedTests = 0;
  let totalTests = testCases.length;

  for (const testCase of testCases) {
    console.log(`\n🔍 Testing: ${testCase.name}`);
    console.log(`   ${testCase.description}`);
    
    try {
      const response = await axios.post(
        `${BASE_URL}/api/client/sms/send`,
        testCase.payload,
        {
          headers: {
            'X-API-Key': API_KEY,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // If we get here, the request succeeded when it should have failed
      console.log(`   ❌ FAILED: Request succeeded when it should have failed`);
      console.log(`   Response:`, response.data);
      
    } catch (error) {
      const errorResponse = error.response?.data;
      const errorCode = errorResponse?.error?.code;
      
      if (errorCode === testCase.expectedError) {
        console.log(`   ✅ PASSED: Correctly rejected with ${errorCode}`);
        passedTests++;
      } else {
        console.log(`   ❌ FAILED: Expected ${testCase.expectedError}, got ${errorCode}`);
        console.log(`   Error response:`, errorResponse);
      }
    }
  }

  console.log('\n' + '=' * 50);
  console.log(`📊 Test Results: ${passedTests}/${totalTests} passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All sender ID validation tests passed!');
    console.log('✅ Your white-label SMS platform correctly enforces sender ID rules');
  } else {
    console.log('❌ Some tests failed. Please check the implementation.');
  }
}

// Instructions for running the test
console.log(`
📋 Instructions for running this test:

1. Make sure your backend server is running on ${BASE_URL}
2. Create a test user and generate an API key
3. Update the API_KEY variable in this script
4. Run: node test-sender-id-validation.js

Note: These tests are designed to fail - they test that invalid requests
are properly rejected by your white-label SMS platform.
`);

if (require.main === module) {
  testSenderIdValidation().catch(console.error);
}

module.exports = { testSenderIdValidation, testCases };
