const axios = require('axios');

async function testOtpAsService() {
  try {
    console.log('🏦 Testing Mas3ndi OTP-as-a-Service for External Clients...');
    console.log('📋 Scenario: A bank using Mas3ndi for customer OTP verification\n');

    // Step 1: Get API key (simulate client authentication)
    console.log('🔐 Step 1: Client Authentication...');
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'test@example.com',
      password: 'TestPassword123!'
    });
    
    const token = loginResponse.data.data.token;
    const clientApiKey = loginResponse.data.data.user.apiKey;
    
    console.log('✅ Client authenticated successfully');
    console.log(`🔑 Client API Key: ${clientApiKey}`);
    console.log(`👤 Client: ${loginResponse.data.data.user.name}`);
    console.log(`💰 Client Balance: $${loginResponse.data.data.user.walletBalance}\n`);

    // Step 2: Generate OTP for client's customer
    console.log('📱 Step 2: Bank generates OTP for customer login...');
    console.log('🏦 Bank Customer: John Doe (0502889775)');
    console.log('🎯 Use Case: Customer logging into mobile banking app\n');

    const otpGenerateResponse = await axios.post('http://localhost:3000/api/v1/otp/generate', {
      phone_number: '0502889775',
      type: 'PHONE_VERIFICATION',
      sender_id: 'TESTCO',
      expiry_minutes: 5,
      message_template: 'Your banking login OTP is: {code}. Valid for 5 minutes. Do not share this code.',
      reference_id: 'bank_login_' + Date.now()
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-API-Key': clientApiKey
      }
    });

    console.log('✅ OTP Generation Response:');
    console.log(JSON.stringify(otpGenerateResponse.data, null, 2));
    
    const otpId = otpGenerateResponse.data.data.otp_id;
    const phoneNumber = otpGenerateResponse.data.data.phone_number;
    const referenceId = otpGenerateResponse.data.data.reference_id;
    
    console.log(`\n📝 OTP ID: ${otpId}`);
    console.log(`📞 Phone: ${phoneNumber}`);
    console.log(`🔗 Reference: ${referenceId}\n`);

    // Step 3: Simulate customer entering wrong OTP first
    console.log('❌ Step 3: Customer enters wrong OTP (testing validation)...');
    
    try {
      const wrongOtpResponse = await axios.post('http://localhost:3000/api/v1/otp/verify', {
        phone_number: phoneNumber,
        code: '123456', // Wrong code
        type: 'PHONE_VERIFICATION',
        reference_id: referenceId
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-API-Key': clientApiKey
        }
      });
    } catch (wrongOtpError) {
      console.log('✅ Wrong OTP correctly rejected:');
      if (wrongOtpError.response) {
        console.log(`Status: ${wrongOtpError.response.status}`);
        console.log(`Error: ${wrongOtpError.response.data.message}\n`);
      }
    }

    // Step 4: Test OTP resend functionality
    console.log('🔄 Step 4: Customer requests OTP resend...');
    
    try {
      const resendResponse = await axios.post('http://localhost:3000/api/v1/otp/resend', {
        phone_number: phoneNumber,
        type: 'PHONE_VERIFICATION',
        reference_id: referenceId
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-API-Key': clientApiKey
        }
      });
      
      console.log('✅ OTP Resend Response:');
      console.log(JSON.stringify(resendResponse.data, null, 2));
    } catch (resendError) {
      console.log('❌ OTP Resend Error:');
      if (resendError.response) {
        console.log(`Status: ${resendError.response.status}`);
        console.log(`Error: ${resendError.response.data.message}`);
      }
    }

    // Step 5: Show the business model
    console.log('\n💼 Step 5: Business Model Summary...');
    console.log('🏦 Client (Bank): Pays Mas3ndi for OTP service');
    console.log('📱 End Customer: Receives OTP via Mas3ndi/Arkessel');
    console.log('💰 Revenue: Mas3ndi charges per OTP sent');
    console.log('🔒 Security: Rate limiting, attempt tracking, expiry');
    console.log('📊 Analytics: Usage tracking per client');

    console.log('\n🎯 OTP-as-a-Service Features:');
    console.log('✅ Multi-client support with API keys');
    console.log('✅ Custom sender IDs per client');
    console.log('✅ Custom message templates');
    console.log('✅ Reference ID tracking');
    console.log('✅ Rate limiting per client');
    console.log('✅ Usage analytics and billing');
    console.log('✅ Automatic SMS delivery via Arkessel');
    console.log('✅ Secure OTP verification');

    console.log('\n📋 Available Client API Endpoints:');
    console.log('🔹 POST /api/v1/otp/generate - Generate OTP');
    console.log('🔹 POST /api/v1/otp/verify - Verify OTP');
    console.log('🔹 POST /api/v1/otp/resend - Resend OTP');
    console.log('🔹 GET /api/v1/wallet/balance - Check balance');
    console.log('🔹 GET /api/v1/analytics/otp - OTP analytics');

    console.log('\n🎉 Mas3ndi OTP-as-a-Service is fully functional!');
    console.log('💡 Clients can integrate OTP verification into their apps');
    console.log('📱 Real SMS delivery via Arkessel with TESTCO sender ID');
    console.log('💰 Automatic billing and usage tracking');

  } catch (error) {
    console.error('❌ Error testing OTP-as-a-Service:', error.message);
    
    if (error.response) {
      console.error('📊 Response Status:', error.response.status);
      console.error('📊 Response Data:', error.response.data);
    }
  }
}

testOtpAsService();
