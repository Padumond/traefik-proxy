# White-Label SMS Reseller Flow

## Overview
This document describes the corrected white-label SMS reseller flow that enforces proper sender ID validation and eliminates the global fallback logic.

## ✅ Fixed Issues

### Before (Incorrect)
```javascript
// WRONG: Fallback to global sender ID
const senderId = from || process.env.ARKESSEL_SENDER_ID || "Mas3ndi";
```

### After (Correct)
```javascript
// CORRECT: Require client's approved sender ID
if (!from) {
  return res.status(400).json({
    error: { code: "MISSING_SENDER_ID", message: "Sender ID is required" }
  });
}
const senderId = from; // Use only client's sender ID
```

## 🏗️ White-Label Architecture

```
Client → API Key → Your Platform → Arkessel → SMS Delivery
  ↓         ↓           ↓             ↓
  ✓    Validates   Routes to      Uses your
       sender ID   internal API   API keys
```

## 📋 Complete Flow

### 1. Client Onboarding
1. **Client registers** on your platform
2. **Client requests sender ID** approval
3. **You manually approve** sender ID
4. **Client generates API key** for their application

### 2. SMS Sending Process
1. **Client makes API call** with their API key
2. **Your system validates**:
   - API key is valid and active
   - Sender ID is provided
   - Sender ID format is correct (3-11 alphanumeric)
   - Sender ID is approved for this client
   - Client has sufficient balance
3. **Your system routes** to Arkessel using your API keys
4. **SMS is sent** through Arkessel but appears as your service

### 3. Error Handling
- **Missing sender ID**: `MISSING_SENDER_ID` (400)
- **Invalid format**: `INVALID_SENDER_ID_FORMAT` (400)
- **Unapproved sender**: `INVALID_SENDER_ID` (403)
- **Insufficient balance**: `INSUFFICIENT_BALANCE` (400)

## 🔧 API Endpoints

### Send Single SMS
```http
POST /api/client/sms/send
X-API-Key: client-api-key

{
  "to": "+233123456789",
  "message": "Your message here",
  "from": "ApprovedSender"  // REQUIRED - must be client's approved sender ID
}
```

### Send Bulk SMS
```http
POST /api/client/sms/bulk
X-API-Key: client-api-key

{
  "recipients": ["+233123456789", "+233987654321"],
  "message": "Your bulk message here",
  "from": "ApprovedSender"  // REQUIRED - must be client's approved sender ID
}
```

## 🛡️ Security Features

### 1. Sender ID Validation
- **Format validation**: 3-11 alphanumeric characters
- **Ownership validation**: Sender ID must belong to the authenticated client
- **Approval validation**: Sender ID must have "APPROVED" status
- **No fallback**: No global sender ID fallback allowed

### 2. API Key Security
- **Unique per client**: Each client gets their own API key
- **Rate limiting**: Configurable per client
- **IP whitelisting**: Optional IP restrictions
- **Usage tracking**: Monitor API usage per client

### 3. Balance Management
- **Pre-paid model**: Clients must have sufficient balance
- **Real-time deduction**: Balance deducted immediately on send
- **Transaction logging**: All transactions recorded

## 🧪 Testing

### Automated Tests
```bash
# Run comprehensive white-label flow tests
node test-white-label-flow.js

# Run sender ID validation tests
node test-sender-id-validation.js
```

### Manual Testing Checklist
- [ ] Request without sender ID is rejected
- [ ] Invalid sender ID format is rejected
- [ ] Unapproved sender ID is rejected
- [ ] Valid approved sender ID works
- [ ] Bulk SMS follows same validation rules
- [ ] Error messages are client-friendly

## 📊 Benefits of This Approach

### For You (Reseller)
- **Revenue control**: All SMS goes through your Arkessel account
- **Brand protection**: Clients can't use unauthorized sender IDs
- **Quality control**: Manual approval ensures legitimate use
- **Billing control**: You control pricing and balance management

### For Clients
- **White-label experience**: Appears as your service
- **API simplicity**: Standard REST API with clear error messages
- **Sender ID ownership**: Each client uses their own approved IDs
- **Transparent billing**: Clear cost calculation and balance tracking

## 🔄 Migration Notes

If upgrading from the old system:
1. **Inform clients**: Sender ID is now required in all requests
2. **Update documentation**: Remove references to default sender IDs
3. **Test thoroughly**: Ensure all client integrations work
4. **Monitor logs**: Watch for MISSING_SENDER_ID errors initially

## 🚀 Next Steps

1. **Deploy the fixes** to your staging environment
2. **Run the test scripts** to validate functionality
3. **Update client documentation** with new requirements
4. **Gradually migrate** existing clients to the new flow
5. **Monitor and optimize** based on usage patterns

This corrected implementation ensures your white-label SMS platform operates securely and professionally while maintaining full control over sender ID usage.
