const axios = require('axios');

// Configuration
const API_BASE_URL = 'http://localhost:3000/gateway';
const API_KEY = 'your-client-api-key-here'; // Replace with actual API key

// API Client
class Mas3ndiClient {
  constructor(apiKey, baseUrl = API_BASE_URL) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.headers = {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json'
    };
  }

  async request(method, endpoint, data = null) {
    try {
      const config = {
        method,
        url: `${this.baseUrl}${endpoint}`,
        headers: this.headers,
        timeout: 30000
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(`API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        throw new Error('Network Error: No response received');
      } else {
        throw new Error(`Request Error: ${error.message}`);
      }
    }
  }

  // SMS Methods
  async sendSms(to, message, from = null) {
    return this.request('POST', '/sms/send', { to, message, from });
  }

  async sendBulkSms(recipients, message, from = null) {
    return this.request('POST', '/sms/bulk', { recipients, message, from });
  }

  async getSmsStatus(messageId) {
    return this.request('GET', `/sms/status/${messageId}`);
  }

  async getSmsHistory(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request('GET', `/sms/history${queryString ? '?' + queryString : ''}`);
  }

  async calculateCost(message, recipients) {
    return this.request('POST', '/sms/calculate-cost', { message, recipients });
  }

  // Wallet Methods
  async getBalance() {
    return this.request('GET', '/wallet/balance');
  }

  async getTransactions(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request('GET', `/wallet/transactions${queryString ? '?' + queryString : ''}`);
  }

  async getAccountSummary() {
    return this.request('GET', '/wallet/summary');
  }

  // Sender ID Methods
  async getSenderIds(status = null) {
    const params = status ? { status } : {};
    const queryString = new URLSearchParams(params).toString();
    return this.request('GET', `/sender-ids${queryString ? '?' + queryString : ''}`);
  }

  async getApprovedSenderIds() {
    return this.request('GET', '/sender-ids/approved');
  }

  async requestSenderId(senderId, purpose, sampleMessage) {
    return this.request('POST', '/sender-ids/request', {
      sender_id: senderId,
      purpose,
      sample_message: sampleMessage
    });
  }

  async validateSenderId(senderId) {
    return this.request('POST', '/sender-ids/validate', { sender_id: senderId });
  }
}

// Test Functions
async function testClientAPI() {
  console.log('🚀 Testing Mas3ndi Client API\n');
  console.log('='.repeat(50));

  const client = new Mas3ndiClient(API_KEY);

  try {
    // Test 1: Get Balance
    console.log('\n📊 Testing: Get Balance');
    try {
      const balance = await client.getBalance();
      console.log('✅ Success:', JSON.stringify(balance, null, 2));
    } catch (error) {
      console.log('❌ Error:', error.message);
    }

    // Test 2: Calculate SMS Cost
    console.log('\n💰 Testing: Calculate SMS Cost');
    try {
      const cost = await client.calculateCost('Hello World!', ['+233123456789']);
      console.log('✅ Success:', JSON.stringify(cost, null, 2));
    } catch (error) {
      console.log('❌ Error:', error.message);
    }

    // Test 3: Get Approved Sender IDs
    console.log('\n📝 Testing: Get Approved Sender IDs');
    try {
      const senderIds = await client.getApprovedSenderIds();
      console.log('✅ Success:', JSON.stringify(senderIds, null, 2));
    } catch (error) {
      console.log('❌ Error:', error.message);
    }

    // Test 4: Validate Sender ID
    console.log('\n🔍 Testing: Validate Sender ID');
    try {
      const validation = await client.validateSenderId('TestBrand');
      console.log('✅ Success:', JSON.stringify(validation, null, 2));
    } catch (error) {
      console.log('❌ Error:', error.message);
    }

    // Test 5: Get SMS History
    console.log('\n📋 Testing: Get SMS History');
    try {
      const history = await client.getSmsHistory({ limit: 5 });
      console.log('✅ Success:', JSON.stringify(history, null, 2));
    } catch (error) {
      console.log('❌ Error:', error.message);
    }

    // Test 6: Get Account Summary
    console.log('\n📈 Testing: Get Account Summary');
    try {
      const summary = await client.getAccountSummary();
      console.log('✅ Success:', JSON.stringify(summary, null, 2));
    } catch (error) {
      console.log('❌ Error:', error.message);
    }

    // Test 7: Send Test SMS (commented out to avoid charges)
    console.log('\n📱 Testing: Send SMS (SIMULATION)');
    console.log('ℹ️  SMS sending test is commented out to avoid charges');
    console.log('ℹ️  Uncomment the code below to test actual SMS sending');
    /*
    try {
      const sms = await client.sendSms('+233123456789', 'Test message from Mas3ndi API', 'TestBrand');
      console.log('✅ Success:', JSON.stringify(sms, null, 2));
    } catch (error) {
      console.log('❌ Error:', error.message);
    }
    */

  } catch (error) {
    console.error('❌ Test Suite Error:', error.message);
  }

  console.log('\n' + '='.repeat(50));
  console.log('✅ API Testing Complete!');
}

// Example Usage Functions
function showExamples() {
  console.log('\n📚 Example Usage:\n');

  console.log('// Initialize client');
  console.log('const client = new Mas3ndiClient("your-api-key");');

  console.log('\n// Send single SMS');
  console.log('const result = await client.sendSms("+233123456789", "Hello World!", "YourBrand");');

  console.log('\n// Send bulk SMS');
  console.log('const recipients = ["+233123456789", "+233987654321"];');
  console.log('const result = await client.sendBulkSms(recipients, "Bulk message", "YourBrand");');

  console.log('\n// Check balance');
  console.log('const balance = await client.getBalance();');

  console.log('\n// Get SMS history');
  console.log('const history = await client.getSmsHistory({ limit: 10, status: "delivered" });');

  console.log('\n// Calculate cost');
  console.log('const cost = await client.calculateCost("Your message", ["+233123456789"]);');
}

// Run tests if this file is executed directly
if (require.main === module) {
  if (API_KEY === 'your-client-api-key-here') {
    console.log('❌ Please set a valid API key in the API_KEY variable');
    console.log('ℹ️  You can get an API key from your Mas3ndi dashboard');
    showExamples();
  } else {
    testClientAPI().catch(console.error);
  }
}

// Export for use as a module
module.exports = { Mas3ndiClient, testClientAPI };
