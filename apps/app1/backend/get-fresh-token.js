const axios = require('axios');

async function getFreshToken() {
  try {
    console.log('🔐 Getting fresh token for test@example.com...');
    
    // Login to get fresh token
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'test@example.com',
      password: 'TestPassword123!'
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ Login successful!');
    console.log('📊 Login Response:', JSON.stringify(loginResponse.data, null, 2));
    
    const token = loginResponse.data.data.token;
    console.log('\n🔑 Fresh Token:', token);
    
    // Now test the sender IDs endpoint with fresh token
    console.log('\n🧪 Testing Sender IDs API with fresh token...');
    
    const senderIdsResponse = await axios.get('http://localhost:3000/api/sender-ids', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ Sender IDs API Response Status:', senderIdsResponse.status);
    console.log('📊 Sender IDs API Response:', JSON.stringify(senderIdsResponse.data, null, 2));
    
    // Check for TESTCO sender ID
    if (senderIdsResponse.data && senderIdsResponse.data.data) {
      const senderIds = senderIdsResponse.data.data;
      console.log(`\n📋 Found ${senderIds.length} sender IDs:`);
      
      senderIds.forEach((senderId, index) => {
        console.log(`${index + 1}. ${senderId.senderId} - Status: ${senderId.status}`);
      });
      
      const approvedSenderIds = senderIds.filter(s => s.status === 'APPROVED');
      console.log(`\n✅ Approved sender IDs: ${approvedSenderIds.length}`);
      approvedSenderIds.forEach(s => {
        console.log(`   - ${s.senderId}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.response) {
      console.error('📊 Response Status:', error.response.status);
      console.error('📊 Response Data:', error.response.data);
    }
  }
}

getFreshToken();
