const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3000';
const TEST_CONFIG = {
  // Test user credentials (you'll need to create these)
  testUser: {
    email: 'testclient@example.com',
    password: 'TestPassword123!'
  },
  // Test phone numbers (use your own for testing)
  testPhones: ['+233123456789', '+233987654321'],
  // Test sender IDs
  testSenderIds: {
    approved: 'TestSender', // This should be approved for the test user
    unapproved: 'BadSender', // This should NOT be approved
    invalid: '12', // Invalid format (too short)
  }
};

class WhiteLabelFlowTester {
  constructor() {
    this.apiKey = null;
    this.authToken = null;
  }

  async log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async makeRequest(method, endpoint, data = null, headers = {}) {
    try {
      const config = {
        method,
        url: `${BASE_URL}${endpoint}`,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return { success: true, data: response.data, status: response.status };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message,
        status: error.response?.status || 500
      };
    }
  }

  async testStep1_Authentication() {
    await this.log('Step 1: Testing Authentication Flow');
    
    // Login to get auth token
    const loginResult = await this.makeRequest('POST', '/api/auth/login', {
      email: TEST_CONFIG.testUser.email,
      password: TEST_CONFIG.testUser.password
    });

    if (!loginResult.success) {
      await this.log('Failed to login. Please ensure test user exists.', 'error');
      return false;
    }

    this.authToken = loginResult.data.token;
    await this.log('✓ User authentication successful');
    return true;
  }

  async testStep2_ApiKeyGeneration() {
    await this.log('Step 2: Testing API Key Generation');

    const apiKeyResult = await this.makeRequest('POST', '/api/api-keys', {
      name: 'Test White Label Key',
      permissions: ['sms:send', 'sms:status'],
      rateLimit: 100
    }, {
      'Authorization': `Bearer ${this.authToken}`
    });

    if (!apiKeyResult.success) {
      await this.log('Failed to generate API key', 'error');
      return false;
    }

    this.apiKey = apiKeyResult.data.apiKey;
    await this.log('✓ API key generated successfully');
    return true;
  }

  async testStep3_SenderIdValidation() {
    await this.log('Step 3: Testing Sender ID Validation');

    // Test 1: Missing sender ID
    await this.log('Test 3.1: Missing sender ID (should fail)');
    const noSenderResult = await this.makeRequest('POST', '/api/client/sms/send', {
      to: TEST_CONFIG.testPhones[0],
      message: 'Test message without sender ID'
    }, {
      'X-API-Key': this.apiKey
    });

    if (noSenderResult.success) {
      await this.log('ERROR: Request succeeded without sender ID!', 'error');
      return false;
    }

    if (noSenderResult.error?.error?.code !== 'MISSING_SENDER_ID') {
      await this.log(`ERROR: Wrong error code. Expected MISSING_SENDER_ID, got ${noSenderResult.error?.error?.code}`, 'error');
      return false;
    }
    await this.log('✓ Missing sender ID properly rejected');

    // Test 2: Invalid sender ID format
    await this.log('Test 3.2: Invalid sender ID format (should fail)');
    const invalidSenderResult = await this.makeRequest('POST', '/api/client/sms/send', {
      to: TEST_CONFIG.testPhones[0],
      message: 'Test message with invalid sender',
      from: TEST_CONFIG.testSenderIds.invalid
    }, {
      'X-API-Key': this.apiKey
    });

    if (invalidSenderResult.success) {
      await this.log('ERROR: Request succeeded with invalid sender ID format!', 'error');
      return false;
    }

    if (invalidSenderResult.error?.error?.code !== 'INVALID_SENDER_ID_FORMAT') {
      await this.log(`ERROR: Wrong error code. Expected INVALID_SENDER_ID_FORMAT, got ${invalidSenderResult.error?.error?.code}`, 'error');
      return false;
    }
    await this.log('✓ Invalid sender ID format properly rejected');

    // Test 3: Unapproved sender ID
    await this.log('Test 3.3: Unapproved sender ID (should fail)');
    const unapprovedSenderResult = await this.makeRequest('POST', '/api/client/sms/send', {
      to: TEST_CONFIG.testPhones[0],
      message: 'Test message with unapproved sender',
      from: TEST_CONFIG.testSenderIds.unapproved
    }, {
      'X-API-Key': this.apiKey
    });

    if (unapprovedSenderResult.success) {
      await this.log('ERROR: Request succeeded with unapproved sender ID!', 'error');
      return false;
    }

    if (unapprovedSenderResult.error?.error?.code !== 'INVALID_SENDER_ID') {
      await this.log(`ERROR: Wrong error code. Expected INVALID_SENDER_ID, got ${unapprovedSenderResult.error?.error?.code}`, 'error');
      return false;
    }
    await this.log('✓ Unapproved sender ID properly rejected');

    return true;
  }

  async testStep4_ValidSmsFlow() {
    await this.log('Step 4: Testing Valid SMS Flow');

    // Test with approved sender ID
    const validSmsResult = await this.makeRequest('POST', '/api/client/sms/send', {
      to: TEST_CONFIG.testPhones[0],
      message: 'Test message with approved sender ID',
      from: TEST_CONFIG.testSenderIds.approved
    }, {
      'X-API-Key': this.apiKey
    });

    if (!validSmsResult.success) {
      await this.log(`SMS sending failed: ${validSmsResult.error?.error?.message}`, 'error');
      return false;
    }

    await this.log('✓ SMS sent successfully with approved sender ID');
    await this.log(`Message ID: ${validSmsResult.data.data.message_id}`);
    await this.log(`Sender: ${validSmsResult.data.data.sender}`);
    
    return true;
  }

  async testStep5_BulkSmsFlow() {
    await this.log('Step 5: Testing Bulk SMS Flow');

    const bulkSmsResult = await this.makeRequest('POST', '/api/client/sms/bulk', {
      recipients: TEST_CONFIG.testPhones,
      message: 'Bulk test message with approved sender ID',
      from: TEST_CONFIG.testSenderIds.approved
    }, {
      'X-API-Key': this.apiKey
    });

    if (!bulkSmsResult.success) {
      await this.log(`Bulk SMS sending failed: ${bulkSmsResult.error?.error?.message}`, 'error');
      return false;
    }

    await this.log('✓ Bulk SMS sent successfully');
    await this.log(`Message ID: ${bulkSmsResult.data.data.message_id}`);
    await this.log(`Valid recipients: ${bulkSmsResult.data.data.valid_recipients}`);
    
    return true;
  }

  async runAllTests() {
    await this.log('🚀 Starting White-Label SMS Flow Tests');
    await this.log('='.repeat(50));

    const tests = [
      this.testStep1_Authentication,
      this.testStep2_ApiKeyGeneration,
      this.testStep3_SenderIdValidation,
      this.testStep4_ValidSmsFlow,
      this.testStep5_BulkSmsFlow
    ];

    let passedTests = 0;
    for (let i = 0; i < tests.length; i++) {
      try {
        const result = await tests[i].call(this);
        if (result) {
          passedTests++;
        } else {
          await this.log(`Test ${i + 1} failed`, 'error');
          break;
        }
      } catch (error) {
        await this.log(`Test ${i + 1} threw error: ${error.message}`, 'error');
        break;
      }
      await this.log(''); // Empty line for readability
    }

    await this.log('='.repeat(50));
    await this.log(`Tests completed: ${passedTests}/${tests.length} passed`, 
                   passedTests === tests.length ? 'success' : 'error');

    if (passedTests === tests.length) {
      await this.log('🎉 All white-label flow tests passed!', 'success');
      await this.log('Your SMS reseller platform is working correctly!', 'success');
    } else {
      await this.log('❌ Some tests failed. Please check the implementation.', 'error');
    }
  }
}

// Run the tests
if (require.main === module) {
  const tester = new WhiteLabelFlowTester();
  tester.runAllTests().catch(console.error);
}

module.exports = WhiteLabelFlowTester;
