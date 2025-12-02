const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testApprovalProcess() {
  console.log('🧪 Testing Sender ID Approval Process');
  console.log('=' * 50);

  try {
    // Login as admin
    console.log('\n🔐 Step 1: Login as admin');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'admin@mas3ndi.com',
      password: 'Admin123!'
    });

    const token = loginResponse.data.data.token;
    console.log('✅ Admin login successful');

    // Get all sender IDs to find a pending one
    console.log('\n📋 Step 2: Get all sender IDs');
    const senderIdsResponse = await axios.get(`${BASE_URL}/api/sender-ids/all`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const senderIds = senderIdsResponse.data.data.data;
    const pendingSenderId = senderIds.find(s => s.status === 'PENDING');
    
    if (!pendingSenderId) {
      console.log('❌ No pending sender IDs found to test approval');
      return;
    }

    console.log('✅ Found pending sender ID:', pendingSenderId.senderId);
    console.log('📊 Before approval:');
    console.log('- Status:', pendingSenderId.status);
    console.log('- Submitted At:', pendingSenderId.submittedAt);
    console.log('- Updated At:', pendingSenderId.updatedAt);
    console.log('- Approved At:', pendingSenderId.approvedAt || 'null');

    // Approve the sender ID
    console.log('\n✅ Step 3: Approve the sender ID');
    const approvalResponse = await axios.put(`${BASE_URL}/api/sender-ids/${pendingSenderId.id}/status`, {
      status: 'APPROVED',
      notes: 'Approved for testing purposes'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (approvalResponse.data.success) {
      console.log('✅ Sender ID approved successfully');
      
      // Get the updated sender ID to verify approvedAt is set
      console.log('\n🔍 Step 4: Verify approval timestamp');
      const updatedSenderIdsResponse = await axios.get(`${BASE_URL}/api/sender-ids/all`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const updatedSenderIds = updatedSenderIdsResponse.data.data.data;
      const approvedSenderId = updatedSenderIds.find(s => s.id === pendingSenderId.id);
      
      console.log('📊 After approval:');
      console.log('- Status:', approvedSenderId.status);
      console.log('- Submitted At:', approvedSenderId.submittedAt);
      console.log('- Updated At:', approvedSenderId.updatedAt);
      console.log('- Approved At:', approvedSenderId.approvedAt || 'null');
      console.log('- Approved By:', approvedSenderId.approvedBy || 'null');
      console.log('- Admin Notes:', approvedSenderId.adminNotes || 'null');

      if (approvedSenderId.approvedAt) {
        console.log('✅ SUCCESS: approvedAt timestamp is properly set!');
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
  testApprovalProcess().catch(console.error);
}

module.exports = { testApprovalProcess };
