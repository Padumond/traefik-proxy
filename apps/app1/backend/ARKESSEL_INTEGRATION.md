# Arkessel SMS Integration Documentation

## Overview
This document describes the integration between Mas3ndi and Arkessel SMS Gateway API.

## API Configuration

### Environment Variables
```env
ARKESSEL_API_KEY="your-api-key-here"
ARKESSEL_API_URL="https://sms.arkesel.com/sms/api"
ARKESSEL_SENDER_ID="Mas3ndi"
```

### API Endpoints
- **Base URL**: `https://sms.arkesel.com/sms/api`
- **Method**: GET (POST is not supported)
- **Format**: Query parameters

## API Usage

### 1. Check Balance
```
GET https://sms.arkesel.com/sms/api?action=check-balance&api_key={API_KEY}
```

**Response Format:**
```json
{
  "code": "000",
  "message": "Success",
  "data": {
    "balance": 100.50,
    "user": "username"
  }
}
```

### 2. Send SMS
```
GET https://sms.arkesel.com/sms/api?action=send-sms&api_key={API_KEY}&to={PHONE}&from={SENDER}&sms={MESSAGE}
```

**Parameters:**
- `action`: "send-sms"
- `api_key`: Your Arkessel API key
- `to`: Recipient phone number (international format: +233123456789)
- `from`: Sender ID (must be approved)
- `sms`: URL-encoded message content

**Response Format:**
```json
{
  "code": "000",
  "message": "Success",
  "data": {
    "id": "message_id_here",
    "balance": 99.50,
    "user": "username",
    "type": "plain",
    "unicode": false,
    "message": "Your message",
    "sender": "Mas3ndi",
    "recipients": "+233123456789",
    "scheduled_date": null,
    "created_at": "2024-01-01 12:00:00",
    "updated_at": "2024-01-01 12:00:00"
  }
}
```

## Error Codes

| Code | Message | Description |
|------|---------|-------------|
| 000  | Success | Request successful |
| 102  | Authentication Failed | Invalid API key |
| 103  | Insufficient Balance | Not enough credits |
| 104  | Invalid Phone Number | Phone number format error |
| 105  | Invalid Sender ID | Sender ID not approved |

## Implementation Details

### Service Classes
1. **ArkeselService** (`src/services/arkessel.service.ts`)
   - Direct API communication
   - Phone number validation
   - Cost calculation
   - Error handling

2. **SmsService** (`src/services/sms.service.ts`)
   - Business logic wrapper
   - Database logging
   - Wallet management
   - User validation

### Phone Number Format
- **Input**: Various formats (+233123456789, 233123456789, +233 12 345 6789)
- **Output**: International format (+233123456789)
- **Validation**: Must be 10-15 digits after country code

### SMS Cost Calculation
- **Standard SMS**: 160 characters max
- **Unicode SMS**: 70 characters max
- **Multi-part**: Automatically calculated
- **Cost**: $0.01 per SMS unit

### Error Handling
- API errors are properly caught and logged
- User-friendly error messages
- Fallback to development mode for testing
- Proper HTTP status codes

## Testing

### Test Endpoints
```
GET /api/test/connection     - Test API connection
GET /api/test/balance        - Check account balance
POST /api/test/sms           - Send test SMS
POST /api/test/validate-phone - Validate phone number
POST /api/test/calculate-cost - Calculate SMS cost
GET /api/test/api-status     - Check configuration
```

### Test Scripts
- `test-arkessel.js` - Comprehensive API testing
- `test-arkessel-simple.js` - Format validation testing

## Troubleshooting

### Common Issues

1. **Authentication Failed (Code 102)**
   - Check API key validity
   - Ensure API key is not expired
   - Verify account status with Arkessel

2. **Invalid Phone Number (Code 104)**
   - Use international format (+country_code + number)
   - Remove spaces, dashes, parentheses
   - Ensure number length is correct

3. **Insufficient Balance (Code 103)**
   - Top up Arkessel account
   - Check balance via API
   - Monitor usage patterns

4. **Invalid Sender ID (Code 105)**
   - Register sender ID with Arkessel
   - Wait for approval
   - Use approved sender IDs only

### Development Mode
When `NODE_ENV=development` and no API key is configured:
- SMS sending is simulated
- Mock responses are returned
- No actual SMS is sent
- Useful for local development

## Security Considerations

1. **API Key Protection**
   - Store in environment variables
   - Never commit to version control
   - Rotate keys regularly
   - Monitor usage

2. **Rate Limiting**
   - Implement request throttling
   - Monitor API usage
   - Set usage alerts

3. **Input Validation**
   - Validate phone numbers
   - Sanitize message content
   - Check sender ID permissions

## Monitoring and Logging

### Logs Include
- API request/response details
- Error messages and codes
- Performance metrics
- Usage statistics

### Metrics to Track
- SMS delivery rates
- API response times
- Error frequencies
- Cost per SMS
- Balance alerts

## Future Enhancements

1. **Delivery Reports**
   - Implement webhook handling
   - Track message status
   - Update database records

2. **Bulk SMS**
   - Optimize for large recipient lists
   - Implement batch processing
   - Add progress tracking

3. **Scheduled SMS**
   - Support future sending
   - Timezone handling
   - Recurring messages

4. **Templates**
   - Pre-approved message templates
   - Variable substitution
   - Compliance checking
