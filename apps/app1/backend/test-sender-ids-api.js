const axios = require('axios');

async function testSenderIdsApi() {
  try {
    console.log('🧪 Testing Sender IDs API...');
    
    // Test user token (from the browser console)
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZlZTgwNjNkLWRlYTEtNGFhZi1iZDJiLWVlZjU3ZDhmNTY4ZiIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInJvbGUiOiJDTElFTlQiLCJpYXQiOjE3NTgxOTM5MDQsImV4cCI6MTc1ODI4MDMwNH0.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
    
    console.log('📧 Testing for user: test@example.com');
    console.log('🔑 Token (first 20 chars):', token.substring(0, 20) + '...');
    
    // Test the sender IDs endpoint
    const response = await axios.get('http://localhost:3000/api/sender-ids', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ API Response Status:', response.status);
    console.log('📊 API Response Data:', JSON.stringify(response.data, null, 2));
    
    // Check if TESTCO sender ID exists
    if (response.data && response.data.data) {
      const senderIds = response.data.data;
      console.log(`\n📋 Found ${senderIds.length} sender IDs:`);
      
      senderIds.forEach((senderId, index) => {
        console.log(`${index + 1}. ${senderId.senderId} - Status: ${senderId.status}`);
      });
      
      const testcoSender = senderIds.find(s => s.senderId === 'TESTCO');
      if (testcoSender) {
        console.log(`\n✅ TESTCO sender ID found!`);
        console.log(`   Status: ${testcoSender.status}`);
        console.log(`   ID: ${testcoSender.id}`);
      } else {
        console.log(`\n❌ TESTCO sender ID not found`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing Sender IDs API:', error.message);
    
    if (error.response) {
      console.error('📊 Response Status:', error.response.status);
      console.error('📊 Response Data:', error.response.data);
    }
  }
}

testSenderIdsApi();
