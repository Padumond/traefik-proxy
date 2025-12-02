import { ArkeselService } from '../../services/arkessel.service';
import { config } from 'dotenv';

// Load environment variables
config();

/**
 * Quick test script for immediate Arkessel integration verification
 * This performs basic connectivity and functionality tests
 */

async function quickTest() {
  console.log('🚀 Starting Quick Arkessel Integration Test\n');

  // Check environment variables
  console.log('📋 Environment Check:');
  const apiKey = process.env.ARKESSEL_API_KEY;
  const senderId = process.env.ARKESSEL_SENDER_ID;
  const testPhone = process.env.TEST_PHONE_NUMBER;

  console.log(`   API Key: ${apiKey ? '✅ Set' : '❌ Missing'}`);
  console.log(`   Sender ID: ${senderId ? '✅ Set' : '❌ Missing'}`);
  console.log(`   Test Phone: ${testPhone ? '✅ Set' : '❌ Missing'}`);

  if (!apiKey || !senderId) {
    console.log('\n❌ Missing required environment variables. Please check your .env file.');
    return;
  }

  console.log('\n🔗 Testing API Connectivity...');

  try {
    // Test 1: Connection Test
    console.log('1. Testing connection...');
    const connectionResult = await ArkeselService.testConnection();
    console.log(`   ✅ Connection: ${connectionResult.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`   📊 Balance: ${connectionResult.balance || 'N/A'}`);

    // Test 2: Balance Check
    console.log('\n2. Testing balance check...');
    const balanceResult = await ArkeselService.getBalance();
    console.log(`   ✅ Balance retrieved: ${balanceResult.data?.balance || 'N/A'}`);

    // Test 3: Phone Number Validation
    console.log('\n3. Testing phone number validation...');
    const testNumbers = ['+1234567890', 'invalid', '', '+12345'];
    testNumbers.forEach(number => {
      const formatted = ArkeselService.formatPhoneNumber(number);
      const valid = ArkeselService.validatePhoneNumber(formatted);
      console.log(`   ${number} → ${formatted} (${valid ? '✅ Valid' : '❌ Invalid'})`);
    });

    // Test 4: SMS Count Calculation
    console.log('\n4. Testing SMS count calculation...');
    const testMessages = [
      'Short message',
      'A'.repeat(160),
      'A'.repeat(161),
      'Unicode message with emoji 😀',
    ];
    testMessages.forEach(message => {
      const count = ArkeselService.calculateSmsCount(message);
      const preview = message.length > 30 ? message.substring(0, 30) + '...' : message;
      console.log(`   "${preview}" (${message.length} chars) → ${count} SMS`);
    });

    // Test 5: SMS Sending (only if test phone is provided)
    if (testPhone) {
      console.log('\n5. Testing SMS sending...');
      console.log('   ⚠️  This will send a real SMS and consume credits!');
      
      try {
        const smsResult = await ArkeselService.sendSms({
          to: testPhone,
          message: `Quick test SMS from Mas3ndi - ${new Date().toISOString()}`,
          sender: senderId,
        });
        
        console.log(`   ✅ SMS sent successfully!`);
        console.log(`   📱 Message ID: ${smsResult.data?.id}`);
        console.log(`   💰 Remaining balance: ${smsResult.data?.balance}`);
      } catch (error: any) {
        console.log(`   ❌ SMS sending failed: ${error.message}`);
      }
    } else {
      console.log('\n5. Skipping SMS sending test (no test phone number provided)');
    }

    console.log('\n🎉 Quick test completed successfully!');
    console.log('\n📝 Next Steps:');
    console.log('   1. Run full test suite: npm run test');
    console.log('   2. Run manual integration tests: npm run test:manual');
    console.log('   3. Check the MANUAL_TESTING_GUIDE.md for comprehensive testing');

  } catch (error: any) {
    console.log(`\n❌ Test failed: ${error.message}`);
    console.log('\n🔍 Troubleshooting:');
    console.log('   1. Check your Arkessel API key is valid');
    console.log('   2. Ensure your sender ID is approved');
    console.log('   3. Verify your internet connection');
    console.log('   4. Check Arkessel service status');
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  quickTest().catch(error => {
    console.error('Quick test failed:', error);
    process.exit(1);
  });
}

export { quickTest };
