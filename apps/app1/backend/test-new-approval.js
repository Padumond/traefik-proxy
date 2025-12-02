const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testNewApproval() {
  console.log('🧪 Testing New Sender ID Approval Process');
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
    console.log('\n📝 Step 2: Create new sender ID');
    const createResponse = await axios.post(`${BASE_URL}/api/sender-ids`, {
      senderId: 'NEWTEST456',
      purpose: 'This is a new test sender ID to verify that the approval process correctly sets the approvedAt timestamp when an admin approves it.',
      sampleMessage: 'This is a sample message from NEWTEST456',
      companyName: 'New Test Company'
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
    console.log('📊 Initial state:');
    console.log('- Status:', newSenderId.status);
    console.log('- Submitted At:', newSenderId.submittedAt);
    console.log('- Approved At:', newSenderId.approvedAt || 'null');

    // Login as admin
    console.log('\n🔐 Step 3: Login as admin');
    const adminLoginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'admin@mas3ndi.com',
      password: 'Admin123!'
    });

    const adminToken = adminLoginResponse.data.data.token;
    console.log('✅ Admin login successful');

    // Approve the new sender ID
    console.log('\n✅ Step 4: Approve the new sender ID');
    const approvalResponse = await axios.put(`${BASE_URL}/api/sender-ids/${newSenderId.id}/status`, {
      status: 'APPROVED',
      notes: 'Approved for testing the new approval process with proper timestamps'
    }, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (approvalResponse.data.success) {
      console.log('✅ Sender ID approved successfully');
      
      const approvedSenderId = approvalResponse.data.data;
      console.log('📊 After approval:');
      console.log('- Status:', approvedSenderId.status);
      console.log('- Submitted At:', approvedSenderId.submittedAt);
      console.log('- Updated At:', approvedSenderId.updatedAt);
      console.log('- Approved At:', approvedSenderId.approvedAt || 'null');
      console.log('- Approved By:', approvedSenderId.approvedBy || 'null');
      console.log('- Admin Notes:', approvedSenderId.adminNotes || 'null');

      if (approvedSenderId.approvedAt) {
        console.log('🎉 SUCCESS: approvedAt timestamp is properly set!');
        console.log('🎯 The approval process is working correctly!');
      } else {
        console.log('❌ ISSUE: approvedAt timestamp is still null');
      }

    } else {
      console.log('❌ Failed to approve sender ID:', approvalResponse.data);
    }

  } catch (error) {
    console.log('❌ Error:', error.response?.data || error.message);
  }
}

if (require.main === module) {
  testNewApproval().catch(console.error);
}

module.exports = { testNewApproval };
