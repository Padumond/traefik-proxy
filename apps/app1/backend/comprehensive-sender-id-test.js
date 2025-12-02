const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function runComprehensiveSenderIdTests() {
  console.log('🧪 Comprehensive Sender ID Validation Tests');
  console.log('=' * 60);
  
  const testCases = [
    {
      name: 'Missing sender ID',
      payload: {
        to: '+233123456789',
        message: 'Test message without sender ID'
      },
      expectedError: 'MISSING_SENDER_ID',
      shouldFail: true
    },
    {
      name: 'Invalid sender ID - too short (2 chars)',
      payload: {
        to: '+233123456789',
        message: 'Test message',
        from: '12'
      },
      expectedError: 'INVALID_SENDER_ID_FORMAT',
      shouldFail: true
    },
    {
      name: 'Invalid sender ID - too long (12 chars)',
      payload: {
        to: '+233123456789',
        message: 'Test message',
        from: 'ThisIsTooLong'
      },
      expectedError: 'INVALID_SENDER_ID_FORMAT',
      shouldFail: true
    },
    {
      name: 'Invalid sender ID - special characters',
      payload: {
        to: '+233123456789',
        message: 'Test message',
        from: 'Test@123'
      },
      expectedError: 'INVALID_SENDER_ID_FORMAT',
      shouldFail: true
    },
    {
      name: 'Invalid sender ID - spaces',
      payload: {
        to: '+233123456789',
        message: 'Test message',
        from: 'Test 123'
      },
      expectedError: 'INVALID_SENDER_ID_FORMAT',
      shouldFail: true
    },
    {
      name: 'Valid sender ID format - 3 chars',
      payload: {
        to: '+233123456789',
        message: 'Test message',
        from: 'ABC'
      },
      expectedError: null,
      shouldFail: false
    },
    {
      name: 'Valid sender ID format - 11 chars',
      payload: {
        to: '+233123456789',
        message: 'Test message',
        from: 'TestSender1'
      },
      expectedError: null,
      shouldFail: false
    },
    {
      name: 'Valid sender ID format - mixed alphanumeric',
      payload: {
        to: '+233123456789',
        message: 'Test message',
        from: 'Test123'
      },
      expectedError: null,
      shouldFail: false
    },
    {
      name: 'Missing phone number',
      payload: {
        message: 'Test message',
        from: 'TestSend'
      },
      expectedError: 'MISSING_PARAMETERS',
      shouldFail: true
    },
    {
      name: 'Missing message',
      payload: {
        to: '+233123456789',
        from: 'TestSend'
      },
      expectedError: 'MISSING_PARAMETERS',
      shouldFail: true
    }
  ];

  let passedTests = 0;
  let totalTests = testCases.length;

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n🔍 Test ${i + 1}: ${testCase.name}`);
    
    try {
      const response = await axios.post(`${BASE_URL}/test/sms/send`, testCase.payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (testCase.shouldFail) {
        console.log(`   ❌ FAILED: Expected failure but request succeeded`);
        console.log(`   Response:`, response.data);
      } else {
        console.log(`   ✅ PASSED: Request succeeded as expected`);
        console.log(`   Response:`, response.data.message);
        passedTests++;
      }
      
    } catch (error) {
      const errorResponse = error.response?.data;
      const errorCode = errorResponse?.error?.code;
      
      if (testCase.shouldFail) {
        if (errorCode === testCase.expectedError) {
          console.log(`   ✅ PASSED: Correctly rejected with ${errorCode}`);
          passedTests++;
        } else {
          console.log(`   ❌ FAILED: Expected ${testCase.expectedError}, got ${errorCode}`);
          console.log(`   Error:`, errorResponse?.error?.message);
        }
      } else {
        console.log(`   ❌ FAILED: Expected success but got error ${errorCode}`);
        console.log(`   Error:`, errorResponse?.error?.message);
      }
    }
  }

  console.log('\n' + '=' * 60);
  console.log(`📊 Test Results: ${passedTests}/${totalTests} passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All sender ID validation tests passed!');
    console.log('✅ Your white-label SMS platform correctly enforces sender ID rules');
    console.log('✅ No global fallback - clients must provide their own sender IDs');
    console.log('✅ Proper format validation (3-11 alphanumeric characters)');
    console.log('✅ Clear error messages for debugging');
  } else {
    console.log('❌ Some tests failed. Please check the implementation.');
  }

  return passedTests === totalTests;
}

if (require.main === module) {
  runComprehensiveSenderIdTests().catch(console.error);
}

module.exports = { runComprehensiveSenderIdTests };
