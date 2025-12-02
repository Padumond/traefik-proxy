# Mas3ndi Client API Documentation

## Overview
The Mas3ndi Client API allows you to integrate SMS functionality directly into your applications. This RESTful API provides endpoints for sending SMS, managing sender IDs, checking balances, and more.

## Authentication
All API requests require authentication using an API key in the header:

```
X-API-Key: your-api-key-here
```

## Base URL
```
https://your-mas3ndi-domain.com/gateway
```

## Response Format
All responses follow a consistent JSON format:

**Success Response:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message"
  }
}
```

## SMS Endpoints

### Send Single SMS
Send an SMS to one or more recipients.

**Endpoint:** `POST /sms/send`

**Request Body:**
```json
{
  "to": "+233123456789",
  "message": "Hello, this is a test message!",
  "from": "YourBrand"
}
```

**Parameters:**
- `to` (string|array): Phone number(s) in international format
- `message` (string): SMS content (max 1600 characters)
- `from` (string, optional): Approved sender ID

**Response:**
```json
{
  "success": true,
  "data": {
    "message_id": "msg_123456789",
    "status": "sent",
    "message": "SMS sent successfully",
    "cost": 0.01,
    "recipients": 1,
    "sender": "YourBrand"
  }
}
```

### Send Bulk SMS
Send SMS to multiple recipients efficiently.

**Endpoint:** `POST /sms/bulk`

**Request Body:**
```json
{
  "recipients": [
    "+233123456789",
    "+233987654321",
    "+233555666777"
  ],
  "message": "Bulk SMS message content",
  "from": "YourBrand"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message_id": "bulk_123456789",
    "status": "sent",
    "message": "Bulk SMS sent successfully",
    "cost": 0.03,
    "total_recipients": 3,
    "valid_recipients": 3,
    "invalid_recipients": 0,
    "sender": "YourBrand"
  }
}
```

### Get SMS Status
Check the delivery status of a sent message.

**Endpoint:** `GET /sms/status/{message_id}`

**Response:**
```json
{
  "success": true,
  "data": {
    "message_id": "msg_123456789",
    "status": "delivered",
    "recipients": ["+233123456789"],
    "message": "Hello, this is a test message!",
    "sender": "YourBrand",
    "cost": 0.01,
    "sent_at": "2024-01-15T10:30:00Z",
    "provider_ref": "arkessel_ref_123"
  }
}
```

### Get SMS History
Retrieve your SMS sending history with pagination.

**Endpoint:** `GET /sms/history`

**Query Parameters:**
- `page` (integer): Page number (default: 1)
- `limit` (integer): Records per page (max: 100, default: 20)
- `status` (string): Filter by status (sent, delivered, failed)
- `from_date` (string): Start date (ISO format)
- `to_date` (string): End date (ISO format)
- `sender` (string): Filter by sender ID

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "message_id": "msg_123456789",
      "status": "delivered",
      "recipients": ["+233123456789"],
      "message": "Hello, this is a test message!",
      "sender": "YourBrand",
      "cost": 0.01,
      "sent_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 5,
    "total_records": 100,
    "per_page": 20
  }
}
```

### Calculate SMS Cost
Calculate the cost of sending an SMS before actually sending it.

**Endpoint:** `POST /sms/calculate-cost`

**Request Body:**
```json
{
  "message": "Your message content here",
  "recipients": ["+233123456789", "+233987654321"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message_length": 25,
    "sms_count": 1,
    "recipients": 2,
    "cost_per_sms": 0.01,
    "total_cost": 0.02,
    "is_unicode": false
  }
}
```

## Wallet Endpoints

### Get Balance
Check your current account balance.

**Endpoint:** `GET /wallet/balance`

**Response:**
```json
{
  "success": true,
  "data": {
    "balance": 25.50,
    "currency": "USD"
  }
}
```

### Get Transactions
Retrieve your transaction history.

**Endpoint:** `GET /wallet/transactions`

**Query Parameters:**
- `page` (integer): Page number (default: 1)
- `limit` (integer): Records per page (max: 100, default: 20)
- `type` (string): Filter by type (credit, debit)
- `from_date` (string): Start date (ISO format)
- `to_date` (string): End date (ISO format)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "txn_123456789",
      "type": "debit",
      "amount": 0.01,
      "description": "SMS to 1 recipients",
      "balance_after": 25.49,
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 3,
    "total_records": 50,
    "per_page": 20
  }
}
```

### Get Account Summary
Get a comprehensive overview of your account.

**Endpoint:** `GET /wallet/summary`

**Response:**
```json
{
  "success": true,
  "data": {
    "current_balance": 25.50,
    "currency": "USD",
    "last_30_days": {
      "total_spent": 5.25,
      "total_added": 30.00,
      "sms_sent": 525,
      "transactions": 28
    }
  }
}
```

## Sender ID Endpoints

### Get Sender IDs
Retrieve all your sender IDs.

**Endpoint:** `GET /sender-ids`

**Query Parameters:**
- `status` (string): Filter by status (pending, approved, rejected)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "sender_123",
      "sender_id": "YourBrand",
      "status": "approved",
      "purpose": "Marketing messages",
      "sample_message": "Hello from YourBrand!",
      "created_at": "2024-01-10T09:00:00Z",
      "approved_at": "2024-01-12T14:30:00Z"
    }
  ]
}
```

### Get Approved Sender IDs
Get only approved sender IDs for sending SMS.

**Endpoint:** `GET /sender-ids/approved`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "sender_123",
      "sender_id": "YourBrand",
      "purpose": "Marketing messages",
      "approved_at": "2024-01-12T14:30:00Z"
    }
  ]
}
```

### Request New Sender ID
Submit a new sender ID for approval.

**Endpoint:** `POST /sender-ids/request`

**Request Body:**
```json
{
  "sender_id": "YourBrand",
  "purpose": "Marketing and promotional messages",
  "sample_message": "Hello from YourBrand! Get 20% off today."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "sender_124",
    "sender_id": "YourBrand",
    "status": "pending",
    "purpose": "Marketing and promotional messages",
    "sample_message": "Hello from YourBrand! Get 20% off today.",
    "created_at": "2024-01-15T11:00:00Z",
    "message": "Sender ID request submitted for approval"
  }
}
```

### Validate Sender ID
Check if a sender ID format is valid before requesting.

**Endpoint:** `POST /sender-ids/validate`

**Request Body:**
```json
{
  "sender_id": "YourBrand"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sender_id": "YourBrand",
    "is_valid": true
  }
}
```

## Error Codes

| Code | Description |
|------|-------------|
| `MISSING_PARAMETERS` | Required parameters are missing |
| `INVALID_PHONE_NUMBER` | Phone number format is invalid |
| `INSUFFICIENT_BALANCE` | Not enough balance to complete operation |
| `INVALID_SENDER_ID` | Sender ID is not approved or invalid |
| `MESSAGE_NOT_FOUND` | SMS message not found |
| `SENDER_ID_EXISTS` | Sender ID already exists |
| `ENDPOINT_NOT_FOUND` | API endpoint not found |
| `INTERNAL_ERROR` | Internal server error |

## Rate Limits
- Default: 100 requests per minute
- Bulk SMS: 10 requests per minute
- Custom limits available on request

## SDKs and Examples
Coming soon: Official SDKs for PHP, Python, Node.js, and more.

## Support
For API support, contact: api-support@mas3ndi.com
