import { ArkeselService } from '../../services/arkessel.service';
import { config } from 'dotenv';

// Load environment variables
config();

/**
 * Manual testing script for Arkessel API integration
 * This script performs real API calls to test the integration
 * 
 * Usage: npm run test:manual
 * 
 * Make sure to set the following environment variables:
 * - ARKESSEL_API_KEY: Your actual Arkessel API key
 * - ARKESSEL_SENDER_ID: Your approved sender ID
 * - TEST_PHONE_NUMBER: A phone number you own for testing
 */

interface TestResult {
  test: string;
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  duration?: number;
}

class ArkeselManualTester {
  private results: TestResult[] = [];
  private testPhoneNumber: string;

  constructor() {
    this.testPhoneNumber = process.env.TEST_PHONE_NUMBER || '';
    
    if (!this.testPhoneNumber) {
      console.error('❌ TEST_PHONE_NUMBER environment variable is required');
      process.exit(1);
    }

    if (!process.env.ARKESSEL_API_KEY) {
      console.error('❌ ARKESSEL_API_KEY environment variable is required');
      process.exit(1);
    }

    console.log('🧪 Starting Arkessel Manual Testing');
    console.log(`📱 Test phone number: ${this.testPhoneNumber}`);
    console.log('⚠️  WARNING: This will send real SMS messages and consume credits!\n');
  }

  private async runTest(testName: string, testFunction: () => Promise<any>): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log(`🔄 Running: ${testName}`);
      const result = await testFunction();
      const duration = Date.now() - startTime;
      
      this.results.push({
        test: testName,
        success: true,
        message: 'Test passed',
        data: result,
        duration,
      });
      
      console.log(`✅ ${testName} - PASSED (${duration}ms)`);
      if (result) {
        console.log(`   Result:`, JSON.stringify(result, null, 2));
      }
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      this.results.push({
        test: testName,
        success: false,
        message: 'Test failed',
        error: error.message,
        duration,
      });
      
      console.log(`❌ ${testName} - FAILED (${duration}ms)`);
      console.log(`   Error: ${error.message}`);
    }
    
    console.log(''); // Empty line for readability
  }

  async testConnection(): Promise<void> {
    await this.runTest('Connection Test', async () => {
      return await ArkeselService.testConnection();
    });
  }

  async testBalanceCheck(): Promise<void> {
    await this.runTest('Balance Check', async () => {
      return await ArkeselService.getBalance();
    });
  }

  async testPhoneNumberValidation(): Promise<void> {
    await this.runTest('Phone Number Validation', async () => {
      const testNumbers = [
        this.testPhoneNumber,
        '+1234567890',
        '+233123456789',
        'invalid-number',
        '',
        '+12345', // Too short
      ];

      const results = testNumbers.map(number => ({
        number,
        formatted: ArkeselService.formatPhoneNumber(number),
        valid: ArkeselService.validatePhoneNumber(ArkeselService.formatPhoneNumber(number)),
      }));

      return results;
    });
  }

  async testSmsCountCalculation(): Promise<void> {
    await this.runTest('SMS Count Calculation', async () => {
      const testMessages = [
        'Short message',
        'A'.repeat(160), // Exactly 160 characters
        'A'.repeat(161), // 161 characters (should be 2 SMS)
        'Message with emoji 😀🎉', // Unicode message
        '😀'.repeat(70), // Exactly 70 unicode characters
        '😀'.repeat(71), // 71 unicode characters (should be 2 SMS)
      ];

      const results = testMessages.map(message => ({
        message: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
        length: message.length,
        smsCount: ArkeselService.calculateSmsCount(message),
        isUnicode: /[^\x00-\x7F]/.test(message),
      }));

      return results;
    });
  }

  async testSingleSms(): Promise<void> {
    await this.runTest('Single SMS Send', async () => {
      const message = `Test SMS from Mas3ndi platform - ${new Date().toISOString()}`;
      
      return await ArkeselService.sendSms({
        to: this.testPhoneNumber,
        message,
        sender: process.env.ARKESSEL_SENDER_ID || 'Mas3ndi',
      });
    });
  }

  async testMultipleSms(): Promise<void> {
    await this.runTest('Multiple Recipients SMS', async () => {
      const message = `Bulk test SMS from Mas3ndi - ${new Date().toISOString()}`;
      
      // Send to the same number multiple times to test bulk functionality
      const recipients = [this.testPhoneNumber, this.testPhoneNumber];
      
      return await ArkeselService.sendSms({
        to: recipients,
        message,
        sender: process.env.ARKESSEL_SENDER_ID || 'Mas3ndi',
      });
    });
  }

  async testLongMessage(): Promise<void> {
    await this.runTest('Long Message SMS', async () => {
      const longMessage = `This is a very long test message from the Mas3ndi platform. `.repeat(5) + 
                         `It should be split into multiple SMS parts. Timestamp: ${new Date().toISOString()}`;
      
      console.log(`   Message length: ${longMessage.length} characters`);
      console.log(`   Expected SMS count: ${ArkeselService.calculateSmsCount(longMessage)}`);
      
      return await ArkeselService.sendSms({
        to: this.testPhoneNumber,
        message: longMessage,
        sender: process.env.ARKESSEL_SENDER_ID || 'Mas3ndi',
      });
    });
  }

  async testUnicodeMessage(): Promise<void> {
    await this.runTest('Unicode Message SMS', async () => {
      const unicodeMessage = `Unicode test 🚀: Hello 世界! مرحبا بالعالم! 🎉 Time: ${new Date().toISOString()}`;
      
      console.log(`   Message length: ${unicodeMessage.length} characters`);
      console.log(`   Expected SMS count: ${ArkeselService.calculateSmsCount(unicodeMessage)}`);
      
      return await ArkeselService.sendSms({
        to: this.testPhoneNumber,
        message: unicodeMessage,
        sender: process.env.ARKESSEL_SENDER_ID || 'Mas3ndi',
        type: 'unicode',
      });
    });
  }

  async testScheduledSms(): Promise<void> {
    await this.runTest('Scheduled SMS', async () => {
      const scheduledDate = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes from now
      const message = `Scheduled test SMS from Mas3ndi - should arrive at ${scheduledDate.toISOString()}`;
      
      console.log(`   Scheduled for: ${scheduledDate.toISOString()}`);
      
      return await ArkeselService.sendSms({
        to: this.testPhoneNumber,
        message,
        sender: process.env.ARKESSEL_SENDER_ID || 'Mas3ndi',
        scheduledDate: scheduledDate.toISOString(),
      });
    });
  }

  async testErrorHandling(): Promise<void> {
    await this.runTest('Error Handling - Invalid Phone', async () => {
      try {
        await ArkeselService.sendSms({
          to: 'invalid-phone-number',
          message: 'This should fail',
          sender: process.env.ARKESSEL_SENDER_ID || 'Mas3ndi',
        });
        throw new Error('Expected this test to fail');
      } catch (error: any) {
        // This should fail, which is expected
        return { expectedError: true, error: error.message };
      }
    });
  }

  async testRetryMechanism(): Promise<void> {
    await this.runTest('Retry Mechanism', async () => {
      // This test simulates network issues by making rapid requests
      const promises = Array(3).fill(0).map(async (_, index) => {
        try {
          const result = await ArkeselService.getBalance();
          return { attempt: index + 1, success: true, result };
        } catch (error: any) {
          return { attempt: index + 1, success: false, error: error.message };
        }
      });

      return await Promise.all(promises);
    });
  }

  private generateReport(): void {
    console.log('\n📊 TEST REPORT');
    console.log('='.repeat(50));
    
    const passed = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;
    const total = this.results.length;
    
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    
    const totalDuration = this.results.reduce((sum, r) => sum + (r.duration || 0), 0);
    console.log(`Total Duration: ${totalDuration}ms`);
    console.log(`Average Duration: ${(totalDuration / total).toFixed(1)}ms`);
    
    console.log('\nDetailed Results:');
    this.results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      const duration = result.duration ? `(${result.duration}ms)` : '';
      console.log(`${index + 1}. ${status} ${result.test} ${duration}`);
      
      if (!result.success && result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });
    
    if (failed > 0) {
      console.log('\n⚠️  Some tests failed. Please check the errors above.');
      process.exit(1);
    } else {
      console.log('\n🎉 All tests passed!');
    }
  }

  async runAllTests(): Promise<void> {
    console.log('Starting comprehensive Arkessel API testing...\n');
    
    // Run tests in sequence to avoid rate limiting
    await this.testConnection();
    await this.testBalanceCheck();
    await this.testPhoneNumberValidation();
    await this.testSmsCountCalculation();
    
    // SMS sending tests (these consume credits)
    console.log('⚠️  The following tests will send real SMS messages and consume credits:');
    await this.testSingleSms();
    await this.testMultipleSms();
    await this.testLongMessage();
    await this.testUnicodeMessage();
    await this.testScheduledSms();
    
    // Error handling tests
    await this.testErrorHandling();
    await this.testRetryMechanism();
    
    this.generateReport();
  }
}

// Run the tests if this file is executed directly
if (require.main === module) {
  const tester = new ArkeselManualTester();
  
  // Ask for confirmation before running tests that consume credits
  console.log('⚠️  WARNING: This test will send real SMS messages and consume Arkessel credits!');
  console.log('Make sure you have sufficient balance and want to proceed.');
  console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
  
  setTimeout(() => {
    tester.runAllTests().catch(error => {
      console.error('❌ Test suite failed:', error);
      process.exit(1);
    });
  }, 5000);
}

export { ArkeselManualTester };
