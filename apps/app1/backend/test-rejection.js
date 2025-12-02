const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testRejection() {
  console.log('🧪 Testing Sender ID Rejection Process');
  console.log('=' * 50);

  try {
    // Login as client to create a new sender ID
    console.log('\n🔐 Step 1: Login as client');
    const clientLoginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'client@mas3ndi.com',
      password: 'Client123!'
    });

    const clientToken = clientLoginResponse.data.data.token;
    console.log('✅ Client login successful');

    // Create a new sender ID
    console.log('\n📝 Step 2: Create new sender ID for rejection test');
    const createResponse = await axios.post(`${BASE_URL}/api/sender-ids`, {
      senderId: 'REJECT789',
      purpose: 'This is a test sender ID that will be rejected to verify that the rejection process correctly sets the rejectedAt timestamp.',
      sampleMessage: 'This is a sample message from REJECT789',
      companyName: 'Reject Test Company'
    }, {
      headers: {
        'Authorization': `Bearer ${clientToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!createResponse.data.success) {
      console.log('❌ Failed to create sender ID:', createResponse.data);
      return;
    }

    const newSenderId = createResponse.data.data;
    console.log('✅ Created new sender ID:', newSenderId.senderId);

    // Login as admin
    console.log('\n🔐 Step 3: Login as admin');
    const adminLoginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'admin@mas3ndi.com',
      password: 'Admin123!'
    });

    const adminToken = adminLoginResponse.data.data.token;
    console.log('✅ Admin login successful');

    // Reject the new sender ID
    console.log('\n❌ Step 4: Reject the new sender ID');
    const rejectionResponse = await axios.put(`${BASE_URL}/api/sender-ids/${newSenderId.id}/status`, {
      status: 'REJECTED',
      notes: 'Rejected for testing purposes - sender ID does not meet requirements'
    }, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (rejectionResponse.data.success) {
      console.log('✅ Sender ID rejected successfully');
      
      const rejectedSenderId = rejectionResponse.data.data;
      console.log('📊 After rejection:');
      console.log('- Status:', rejectedSenderId.status);
      console.log('- Submitted At:', rejectedSenderId.submittedAt);
      console.log('- Updated At:', rejectedSenderId.updatedAt);
      console.log('- Approved At:', rejectedSenderId.approvedAt || 'null');
      console.log('- Rejected At:', rejectedSenderId.rejectedAt || 'null');
      console.log('- Approved By:', rejectedSenderId.approvedBy || 'null');
      console.log('- Admin Notes:', rejectedSenderId.adminNotes || 'null');

      if (rejectedSenderId.rejectedAt) {
        console.log('🎉 SUCCESS: rejectedAt timestamp is properly set!');
        console.log('🎯 The rejection process is working correctly!');
      } else {
        console.log('❌ ISSUE: rejectedAt timestamp is still null');
      }

    } else {
      console.log('❌ Failed to reject sender ID:', rejectionResponse.data);
    }

  } catch (error) {
    console.log('❌ Error:', error.response?.data || error.message);
  }
}

if (require.main === module) {
  testRejection().catch(console.error);
}

module.exports = { testRejection };
