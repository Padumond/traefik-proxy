const axios = require('axios');

async function testArkeselFormats() {
  const apiKey = "OkslRjZsNEFoYjc3VVVuJGQ=";
  
  console.log('🧪 Testing different Arkessel API formats...');
  console.log('API Key (first 10 chars):', apiKey.substring(0, 10) + '...\n');

  // Test different URL formats
  const formats = [
    {
      name: "Format 1: /sms/api with action parameter",
      url: `https://sms.arkesel.com/sms/api?action=check-balance&api_key=${apiKey}`
    },
    {
      name: "Format 2: /api/v2 REST style",
      url: `https://sms.arkesel.com/api/v2/clients/balance?api_key=${apiKey}`
    },
    {
      name: "Format 3: /api direct",
      url: `https://sms.arkesel.com/api/check-balance?api_key=${apiKey}`
    },
    {
      name: "Format 4: /sms/api/v2",
      url: `https://sms.arkesel.com/sms/api/v2?action=check-balance&api_key=${apiKey}`
    },
    {
      name: "Format 5: POST to /sms/api",
      url: `https://sms.arkesel.com/sms/api`,
      method: 'POST',
      data: {
        action: 'check-balance',
        api_key: apiKey
      }
    }
  ];

  for (let i = 0; i < formats.length; i++) {
    const format = formats[i];
    console.log(`📊 Testing ${format.name}...`);
    console.log(`URL: ${format.url.replace(apiKey, 'HIDDEN_API_KEY')}`);
    
    try {
      let response;
      
      if (format.method === 'POST') {
        response = await axios.post(format.url, format.data, {
          timeout: 15000,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
      } else {
        response = await axios.get(format.url, {
          timeout: 15000,
          headers: {
            'Accept': 'application/json'
          }
        });
      }
      
      console.log('✅ SUCCESS!');
      console.log('Status:', response.status);
      console.log('Response:', JSON.stringify(response.data, null, 2));
      
      // If we get a successful response, test SMS sending
      if (response.status === 200 && !response.data.code) {
        console.log('\n🎉 Found working format! Testing SMS send...');
        await testSmsSend(format, apiKey);
        break;
      }
      
    } catch (error) {
      console.log('❌ FAILED');
      console.log('Status:', error.response?.status || 'No response');
      console.log('Error:', error.response?.data || error.message);
    }
    
    console.log('─'.repeat(50));
  }
}

async function testSmsSend(workingFormat, apiKey) {
  try {
    const testNumber = '+233123456789'; // Test number
    const sender = 'Mas3ndi';
    const message = 'Test SMS from Mas3ndi - ' + new Date().toISOString();
    
    let smsUrl;
    let smsData;
    
    if (workingFormat.name.includes('Format 1')) {
      smsUrl = `https://sms.arkesel.com/sms/api?action=send-sms&api_key=${apiKey}&to=${testNumber}&from=${sender}&sms=${encodeURIComponent(message)}`;
    } else if (workingFormat.name.includes('Format 2')) {
      smsUrl = `https://sms.arkesel.com/api/v2/sms/send?api_key=${apiKey}&to=${testNumber}&from=${sender}&sms=${encodeURIComponent(message)}`;
    } else if (workingFormat.name.includes('Format 5')) {
      smsUrl = 'https://sms.arkesel.com/sms/api';
      smsData = {
        action: 'send-sms',
        api_key: apiKey,
        to: testNumber,
        from: sender,
        sms: message
      };
    }
    
    console.log('SMS URL:', smsUrl ? smsUrl.replace(apiKey, 'HIDDEN_API_KEY') : 'POST request');
    
    let response;
    if (smsData) {
      response = await axios.post(smsUrl, smsData, {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
    } else {
      response = await axios.get(smsUrl, {
        timeout: 30000,
        headers: {
          'Accept': 'application/json'
        }
      });
    }
    
    console.log('📱 SMS Response:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('❌ SMS Test Failed:');
    console.log('Status:', error.response?.status || 'No response');
    console.log('Error:', error.response?.data || error.message);
  }
}

// Test API key validation
function testApiKeyFormat() {
  const apiKey = "OkslRjZsNEFoYjc3VVVuJGQ=";
  
  console.log('\n🔑 API Key Analysis:');
  console.log('Length:', apiKey.length);
  console.log('Ends with =:', apiKey.endsWith('='));
  console.log('Base64 pattern:', /^[A-Za-z0-9+/]*={0,2}$/.test(apiKey));
  
  // Try to decode if it's base64
  try {
    const decoded = Buffer.from(apiKey, 'base64').toString('utf8');
    console.log('Decoded (if base64):', decoded);
  } catch (e) {
    console.log('Not valid base64 or contains binary data');
  }
}

// Run all tests
async function runTests() {
  console.log('🚀 Arkessel API Format Testing\n');
  console.log('='.repeat(60));
  
  testApiKeyFormat();
  
  console.log('\n' + '='.repeat(60));
  await testArkeselFormats();
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Testing completed!');
}

runTests().catch(console.error);
