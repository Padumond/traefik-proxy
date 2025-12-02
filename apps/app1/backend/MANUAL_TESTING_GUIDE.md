# Manual Integration Testing Guide - Arkessel SMS Integration

This guide provides comprehensive manual testing procedures for the Arkessel SMS integration in the Mas3ndi platform.

## Prerequisites

### 1. Environment Setup
- [ ] Valid Arkessel API key configured in `.env`
- [ ] Approved Arkessel sender ID
- [ ] Test phone number (your own number for receiving test SMS)
- [ ] Database running and migrated
- [ ] Backend server running on port 3000

### 2. Required Environment Variables
```bash
ARKESSEL_API_KEY=your_actual_api_key
ARKESSEL_SENDER_ID=your_approved_sender_id
TEST_PHONE_NUMBER=+1234567890  # Your phone number
```

### 3. Test Data Preparation
- [ ] Create test user account
- [ ] Ensure test user has sufficient wallet balance
- [ ] Create approved sender ID for test user

## Testing Procedures

### Phase 1: Basic API Connectivity

#### Test 1.1: Connection Test
**Objective**: Verify basic connectivity to Arkessel API

**Steps**:
1. Run the connection test:
   ```bash
   npm run test:manual
   ```
2. Or test via API endpoint:
   ```bash
   curl -X GET http://localhost:3000/api/sms/test-connection \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

**Expected Results**:
- [ ] Connection successful
- [ ] Valid response with balance information
- [ ] No authentication errors

#### Test 1.2: Balance Check
**Objective**: Verify balance retrieval functionality

**Steps**:
1. Test balance endpoint:
   ```bash
   curl -X GET http://localhost:3000/api/sms/balance \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

**Expected Results**:
- [ ] Current balance displayed correctly
- [ ] Response time under 5 seconds
- [ ] Proper error handling for invalid credentials

### Phase 2: SMS Sending Tests

#### Test 2.1: Single SMS
**Objective**: Send SMS to single recipient

**Test Data**:
```json
{
  "senderId": "YourSenderID",
  "message": "Test SMS from Mas3ndi platform - Single recipient test",
  "recipients": ["+1234567890"]
}
```

**Steps**:
1. Send POST request to `/api/sms/send`
2. Check response for message ID
3. Verify SMS received on test phone
4. Check SMS log in database

**Expected Results**:
- [ ] SMS sent successfully
- [ ] Message ID returned
- [ ] SMS received within 30 seconds
- [ ] Correct sender ID displayed
- [ ] Message content accurate
- [ ] Database log created

#### Test 2.2: Multiple Recipients
**Objective**: Send SMS to multiple recipients

**Test Data**:
```json
{
  "senderId": "YourSenderID",
  "message": "Bulk test SMS from Mas3ndi platform",
  "recipients": ["+1234567890", "+1234567891"]
}
```

**Steps**:
1. Send bulk SMS request
2. Verify all recipients receive SMS
3. Check cost calculation
4. Verify wallet balance deduction

**Expected Results**:
- [ ] All recipients receive SMS
- [ ] Cost calculated correctly (recipients × SMS parts × rate)
- [ ] Wallet balance updated accurately
- [ ] Individual delivery tracking

#### Test 2.3: Long Message (Multi-part SMS)
**Objective**: Test SMS splitting for long messages

**Test Data**:
```json
{
  "senderId": "YourSenderID",
  "message": "This is a very long test message that should exceed the standard SMS length limit of 160 characters. It will be automatically split into multiple SMS parts by the Arkessel service. This tests the multi-part SMS functionality and cost calculation.",
  "recipients": ["+1234567890"]
}
```

**Expected Results**:
- [ ] Message split correctly
- [ ] All parts received in order
- [ ] Cost reflects multiple SMS parts
- [ ] SMS count calculation accurate

#### Test 2.4: Unicode Message
**Objective**: Test Unicode/emoji support

**Test Data**:
```json
{
  "senderId": "YourSenderID",
  "message": "Unicode test 🚀: Hello 世界! مرحبا بالعالم! 🎉",
  "recipients": ["+1234567890"]
}
```

**Expected Results**:
- [ ] Unicode characters display correctly
- [ ] Emojis render properly
- [ ] Character encoding preserved
- [ ] SMS count calculated for Unicode (70 chars/SMS)

#### Test 2.5: Scheduled SMS
**Objective**: Test SMS scheduling functionality

**Test Data**:
```json
{
  "senderId": "YourSenderID",
  "message": "Scheduled SMS test - should arrive at specified time",
  "recipients": ["+1234567890"],
  "scheduledDate": "2024-12-31T23:59:59Z"
}
```

**Expected Results**:
- [ ] SMS scheduled successfully
- [ ] Delivery at specified time
- [ ] Status tracking works
- [ ] Can cancel before sending

### Phase 3: Error Handling Tests

#### Test 3.1: Invalid Phone Numbers
**Test Cases**:
- [ ] Empty phone number
- [ ] Invalid format (letters)
- [ ] Too short number
- [ ] Too long number
- [ ] Missing country code

**Expected Results**:
- [ ] Proper error messages
- [ ] No SMS sent
- [ ] No wallet deduction
- [ ] Error logged correctly

#### Test 3.2: Insufficient Balance
**Steps**:
1. Reduce wallet balance to near zero
2. Attempt to send expensive SMS
3. Verify error handling

**Expected Results**:
- [ ] Clear insufficient balance error
- [ ] No SMS sent
- [ ] Balance unchanged
- [ ] User notified appropriately

#### Test 3.3: Invalid Sender ID
**Test Cases**:
- [ ] Unapproved sender ID
- [ ] Non-existent sender ID
- [ ] Sender ID with special characters
- [ ] Empty sender ID

**Expected Results**:
- [ ] Appropriate error messages
- [ ] No SMS sent
- [ ] Proper error codes returned

#### Test 3.4: Network Issues
**Simulation**:
- [ ] Disconnect internet during SMS send
- [ ] Test timeout scenarios
- [ ] Verify retry mechanism

**Expected Results**:
- [ ] Graceful error handling
- [ ] Retry attempts logged
- [ ] User informed of failure
- [ ] No duplicate charges

### Phase 4: Performance Tests

#### Test 4.1: High Volume SMS
**Objective**: Test system under load

**Steps**:
1. Send 100 SMS messages rapidly
2. Monitor response times
3. Check delivery rates
4. Verify system stability

**Expected Results**:
- [ ] All messages processed
- [ ] Response times under 10 seconds
- [ ] No system crashes
- [ ] Accurate cost calculation

#### Test 4.2: Concurrent Users
**Objective**: Test multiple users sending SMS simultaneously

**Steps**:
1. Create multiple test users
2. Send SMS from different accounts simultaneously
3. Monitor system performance

**Expected Results**:
- [ ] All requests processed
- [ ] No data corruption
- [ ] Proper user isolation
- [ ] Accurate billing per user

### Phase 5: Integration Tests

#### Test 5.1: End-to-End User Journey
**Scenario**: Complete user workflow

**Steps**:
1. User registration
2. Sender ID creation and approval
3. Wallet top-up
4. SMS sending
5. Delivery tracking
6. Analytics viewing

**Expected Results**:
- [ ] Smooth user experience
- [ ] All features work together
- [ ] Data consistency maintained
- [ ] Proper error handling throughout

#### Test 5.2: API Gateway Integration
**Objective**: Test client API usage

**Steps**:
1. Generate API key for test client
2. Use API key to send SMS via gateway
3. Test rate limiting
4. Verify billing integration

**Expected Results**:
- [ ] API authentication works
- [ ] Rate limiting enforced
- [ ] Proper billing attribution
- [ ] Usage tracking accurate

## Test Results Documentation

### Test Execution Checklist

| Test Case | Status | Notes | Issues Found |
|-----------|--------|-------|--------------|
| 1.1 Connection Test | ⏳ | | |
| 1.2 Balance Check | ⏳ | | |
| 2.1 Single SMS | ⏳ | | |
| 2.2 Multiple Recipients | ⏳ | | |
| 2.3 Long Message | ⏳ | | |
| 2.4 Unicode Message | ⏳ | | |
| 2.5 Scheduled SMS | ⏳ | | |
| 3.1 Invalid Phone Numbers | ⏳ | | |
| 3.2 Insufficient Balance | ⏳ | | |
| 3.3 Invalid Sender ID | ⏳ | | |
| 3.4 Network Issues | ⏳ | | |
| 4.1 High Volume SMS | ⏳ | | |
| 4.2 Concurrent Users | ⏳ | | |
| 5.1 End-to-End Journey | ⏳ | | |
| 5.2 API Gateway | ⏳ | | |

### Performance Metrics

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| SMS Send Response Time | < 5s | | ⏳ |
| Balance Check Response Time | < 2s | | ⏳ |
| SMS Delivery Time | < 30s | | ⏳ |
| System Uptime | 99.9% | | ⏳ |
| Error Rate | < 1% | | ⏳ |

### Issues Tracking

| Issue ID | Description | Severity | Status | Resolution |
|----------|-------------|----------|--------|------------|
| | | | | |

## Sign-off

### Testing Team
- [ ] **Tester Name**: _________________ **Date**: _________
- [ ] **Technical Lead**: _________________ **Date**: _________
- [ ] **Product Owner**: _________________ **Date**: _________

### Approval for Production
- [ ] All critical tests passed
- [ ] Performance requirements met
- [ ] Security tests completed
- [ ] Documentation updated
- [ ] Ready for production deployment

**Final Approval**: _________________ **Date**: _________
