const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testSenderIdFields() {
  console.log('🔍 Testing Sender ID Fields');
  console.log('=' * 50);

  try {
    // Login as client
    console.log('\n🔐 Step 1: Login as client');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'client@mas3ndi.com',
      password: 'Client123!'
    });

    const token = loginResponse.data.data.token;
    console.log('✅ Login successful');

    // Get sender IDs
    console.log('\n📋 Step 2: Get sender IDs and check fields');
    const senderIdsResponse = await axios.get(`${BASE_URL}/api/sender-ids`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (senderIdsResponse.data.success && senderIdsResponse.data.data.data.length > 0) {
      const senderIds = senderIdsResponse.data.data.data;
      const firstSenderId = senderIds[0];
      
      console.log('✅ Sender IDs retrieved successfully');
      console.log('📊 Number of sender IDs:', senderIds.length);
      console.log('\n🔍 First sender ID fields:');
      console.log('- ID:', firstSenderId.id);
      console.log('- Sender ID:', firstSenderId.senderId);
      console.log('- Status:', firstSenderId.status);
      console.log('- Purpose:', firstSenderId.purpose ? firstSenderId.purpose.substring(0, 50) + '...' : 'N/A');
      console.log('- Company Name:', firstSenderId.companyName || 'N/A');
      console.log('- Submitted At:', firstSenderId.submittedAt || 'N/A');
      console.log('- Updated At:', firstSenderId.updatedAt || 'N/A');
      console.log('- Approved At:', firstSenderId.approvedAt || 'N/A');
      console.log('- Rejected At:', firstSenderId.rejectedAt || 'N/A');
      console.log('- Created At (if exists):', firstSenderId.createdAt || 'NOT FOUND');
      
      console.log('\n📝 Available fields in first sender ID:');
      console.log(Object.keys(firstSenderId).sort());
      
      console.log('\n🎯 Date field analysis:');
      const dateFields = ['submittedAt', 'updatedAt', 'approvedAt', 'rejectedAt', 'createdAt'];
      dateFields.forEach(field => {
        const value = firstSenderId[field];
        console.log(`- ${field}: ${value ? `✅ ${value}` : '❌ Not present'}`);
      });
      
    } else {
      console.log('❌ No sender IDs found');
    }

  } catch (error) {
    console.log('❌ Error:', error.response?.data || error.message);
  }
}

if (require.main === module) {
  testSenderIdFields().catch(console.error);
}

module.exports = { testSenderIdFields };
