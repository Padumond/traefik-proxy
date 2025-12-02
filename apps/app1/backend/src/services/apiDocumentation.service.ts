import { ApiGatewayService } from './apiGateway.service';
import { RateLimitConfigService } from './rateLimitConfig.service';

export interface ApiEndpoint {
  path: string;
  method: string;
  summary: string;
  description: string;
  tags: string[];
  parameters?: ApiParameter[];
  requestBody?: ApiRequestBody;
  responses: ApiResponse[];
  examples: ApiExample[];
  rateLimit?: {
    limit: number;
    window: string;
  };
  permissions: string[];
}

export interface ApiParameter {
  name: string;
  in: 'path' | 'query' | 'header';
  required: boolean;
  type: string;
  description: string;
  example?: any;
  enum?: string[];
}

export interface ApiRequestBody {
  required: boolean;
  contentType: string;
  schema: any;
  examples: Record<string, any>;
}

export interface ApiResponse {
  statusCode: number;
  description: string;
  schema?: any;
  examples?: Record<string, any>;
}

export interface ApiExample {
  language: string;
  code: string;
  description?: string;
}

export class ApiDocumentationService {
  /**
   * Generate complete API documentation
   */
  static generateDocumentation(): {
    info: any;
    servers: any[];
    tags: any[];
    endpoints: ApiEndpoint[];
    schemas: any;
    security: any;
  } {
    return {
      info: this.getApiInfo(),
      servers: this.getServers(),
      tags: this.getTags(),
      endpoints: this.getEndpoints(),
      schemas: this.getSchemas(),
      security: this.getSecuritySchemes(),
    };
  }

  /**
   * Get API information
   */
  private static getApiInfo() {
    return {
      title: 'Mas3ndi SMS API',
      version: '1.0.0',
      description: 'Comprehensive SMS API for sending messages, managing OTP, and tracking delivery status',
      contact: {
        name: 'Mas3ndi Support',
        email: 'support@mas3ndi.com',
        url: 'https://mas3ndi.com/support',
      },
      license: {
        name: 'Commercial License',
        url: 'https://mas3ndi.com/license',
      },
    };
  }

  /**
   * Get server configurations
   */
  private static getServers() {
    return [
      {
        url: 'https://api.mas3ndi.com',
        description: 'Production server',
      },
      {
        url: 'https://sandbox.mas3ndi.com',
        description: 'Sandbox server for testing',
      },
    ];
  }

  /**
   * Get API tags
   */
  private static getTags() {
    return [
      {
        name: 'SMS',
        description: 'SMS sending and management operations',
      },
      {
        name: 'OTP',
        description: 'One-Time Password generation and verification',
      },
      {
        name: 'Wallet',
        description: 'Account balance and transaction operations',
      },
      {
        name: 'Sender IDs',
        description: 'Sender ID management and approval',
      },
      {
        name: 'Analytics',
        description: 'Usage analytics and reporting',
      },
    ];
  }

  /**
   * Get all API endpoints
   */
  private static getEndpoints(): ApiEndpoint[] {
    return [
      // SMS Endpoints
      {
        path: '/v1/sms/send',
        method: 'POST',
        summary: 'Send SMS',
        description: 'Send a single SMS message to one or more recipients',
        tags: ['SMS'],
        requestBody: {
          required: true,
          contentType: 'application/json',
          schema: {
            type: 'object',
            required: ['message', 'recipients'],
            properties: {
              message: { type: 'string', maxLength: 1600 },
              recipients: { type: 'array', items: { type: 'string' } },
              senderId: { type: 'string', maxLength: 11 },
              scheduledDate: { type: 'string', format: 'date-time' },
            },
          },
          examples: {
            simple: {
              message: 'Hello, this is a test message!',
              recipients: ['+1234567890'],
              senderId: 'YourBrand',
            },
            scheduled: {
              message: 'Scheduled message',
              recipients: ['+1234567890', '+0987654321'],
              senderId: 'YourBrand',
              scheduledDate: '2024-12-31T23:59:59Z',
            },
          },
        },
        responses: [
          {
            statusCode: 200,
            description: 'SMS sent successfully',
            examples: {
              success: {
                success: true,
                message: 'SMS sent successfully',
                data: {
                  messageId: 'msg_123456789',
                  cost: 0.02,
                  recipients: 1,
                  parts: 1,
                },
              },
            },
          },
          {
            statusCode: 400,
            description: 'Bad request - validation error',
          },
          {
            statusCode: 429,
            description: 'Rate limit exceeded',
          },
        ],
        examples: this.getSmsExamples(),
        permissions: ['sms:send'],
        rateLimit: { limit: 100, window: '1 hour' },
      },

      // OTP Endpoints
      {
        path: '/v1/otp/generate',
        method: 'POST',
        summary: 'Generate OTP',
        description: 'Generate and send a one-time password via SMS',
        tags: ['OTP'],
        requestBody: {
          required: true,
          contentType: 'application/json',
          schema: {
            type: 'object',
            required: ['phone'],
            properties: {
              phone: { type: 'string' },
              length: { type: 'integer', minimum: 4, maximum: 8, default: 6 },
              expiryMinutes: { type: 'integer', minimum: 1, maximum: 60, default: 5 },
              template: { type: 'string' },
            },
          },
          examples: {
            basic: {
              phone: '+1234567890',
            },
            custom: {
              phone: '+1234567890',
              length: 8,
              expiryMinutes: 10,
              template: 'Your verification code is: {otp}',
            },
          },
        },
        responses: [
          {
            statusCode: 200,
            description: 'OTP generated and sent successfully',
            examples: {
              success: {
                success: true,
                message: 'OTP sent successfully',
                data: {
                  otpId: 'otp_123456789',
                  expiresAt: '2024-01-01T12:05:00Z',
                  attemptsRemaining: 3,
                },
              },
            },
          },
        ],
        examples: this.getOtpExamples(),
        permissions: ['otp:generate'],
        rateLimit: { limit: 60, window: '1 hour' },
      },

      // Wallet Endpoints
      {
        path: '/v1/wallet/balance',
        method: 'GET',
        summary: 'Get Balance',
        description: 'Retrieve current account balance',
        tags: ['Wallet'],
        responses: [
          {
            statusCode: 200,
            description: 'Balance retrieved successfully',
            examples: {
              success: {
                success: true,
                message: 'Balance retrieved successfully',
                data: {
                  balance: 150.75,
                  currency: 'USD',
                  lastUpdated: '2024-01-01T12:00:00Z',
                },
              },
            },
          },
        ],
        examples: this.getWalletExamples(),
        permissions: ['wallet:read'],
        rateLimit: { limit: 300, window: '1 hour' },
      },
    ];
  }

  /**
   * Get SMS code examples
   */
  private static getSmsExamples(): ApiExample[] {
    return [
      {
        language: 'curl',
        code: `curl -X POST https://api.mas3ndi.com/v1/sms/send \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{
    "message": "Hello, this is a test message!",
    "recipients": ["+1234567890"],
    "senderId": "YourBrand"
  }'`,
        description: 'Send a simple SMS using cURL',
      },
      {
        language: 'javascript',
        code: `const response = await fetch('https://api.mas3ndi.com/v1/sms/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'YOUR_API_KEY'
  },
  body: JSON.stringify({
    message: 'Hello, this is a test message!',
    recipients: ['+1234567890'],
    senderId: 'YourBrand'
  })
});

const data = await response.json();
console.log(data);`,
        description: 'Send SMS using JavaScript/Node.js',
      },
      {
        language: 'python',
        code: `import requests

url = "https://api.mas3ndi.com/v1/sms/send"
headers = {
    "Content-Type": "application/json",
    "x-api-key": "YOUR_API_KEY"
}
data = {
    "message": "Hello, this is a test message!",
    "recipients": ["+1234567890"],
    "senderId": "YourBrand"
}

response = requests.post(url, headers=headers, json=data)
print(response.json())`,
        description: 'Send SMS using Python',
      },
      {
        language: 'php',
        code: `<?php
$url = 'https://api.mas3ndi.com/v1/sms/send';
$headers = [
    'Content-Type: application/json',
    'x-api-key: YOUR_API_KEY'
];
$data = [
    'message' => 'Hello, this is a test message!',
    'recipients' => ['+1234567890'],
    'senderId' => 'YourBrand'
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
curl_close($ch);

echo $response;
?>`,
        description: 'Send SMS using PHP',
      },
    ];
  }

  /**
   * Get OTP code examples
   */
  private static getOtpExamples(): ApiExample[] {
    return [
      {
        language: 'curl',
        code: `curl -X POST https://api.mas3ndi.com/v1/otp/generate \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{
    "phone": "+1234567890",
    "length": 6,
    "expiryMinutes": 5
  }'`,
        description: 'Generate OTP using cURL',
      },
      {
        language: 'javascript',
        code: `// Generate OTP
const generateOtp = async (phone) => {
  const response = await fetch('https://api.mas3ndi.com/v1/otp/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': 'YOUR_API_KEY'
    },
    body: JSON.stringify({
      phone: phone,
      length: 6,
      expiryMinutes: 5
    })
  });
  
  return await response.json();
};

// Verify OTP
const verifyOtp = async (otpId, code) => {
  const response = await fetch('https://api.mas3ndi.com/v1/otp/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': 'YOUR_API_KEY'
    },
    body: JSON.stringify({
      otpId: otpId,
      code: code
    })
  });
  
  return await response.json();
};`,
        description: 'OTP operations using JavaScript',
      },
    ];
  }

  /**
   * Get wallet code examples
   */
  private static getWalletExamples(): ApiExample[] {
    return [
      {
        language: 'curl',
        code: `curl -X GET https://api.mas3ndi.com/v1/wallet/balance \\
  -H "x-api-key: YOUR_API_KEY"`,
        description: 'Get balance using cURL',
      },
      {
        language: 'javascript',
        code: `const getBalance = async () => {
  const response = await fetch('https://api.mas3ndi.com/v1/wallet/balance', {
    headers: {
      'x-api-key': 'YOUR_API_KEY'
    }
  });
  
  const data = await response.json();
  return data.data.balance;
};`,
        description: 'Get balance using JavaScript',
      },
    ];
  }

  /**
   * Get API schemas
   */
  private static getSchemas() {
    return {
      SmsRequest: {
        type: 'object',
        required: ['message', 'recipients'],
        properties: {
          message: {
            type: 'string',
            maxLength: 1600,
            description: 'The SMS message content',
          },
          recipients: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of phone numbers in international format',
          },
          senderId: {
            type: 'string',
            maxLength: 11,
            description: 'Sender ID (must be approved)',
          },
          scheduledDate: {
            type: 'string',
            format: 'date-time',
            description: 'Schedule SMS for future delivery (ISO 8601 format)',
          },
        },
      },
      SmsResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
          data: {
            type: 'object',
            properties: {
              messageId: { type: 'string' },
              cost: { type: 'number' },
              recipients: { type: 'integer' },
              parts: { type: 'integer' },
            },
          },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string' },
          error: { type: 'string' },
          code: { type: 'string' },
        },
      },
    };
  }

  /**
   * Get security schemes
   */
  private static getSecuritySchemes() {
    return {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'x-api-key',
        description: 'API key for authentication. Get your API key from the dashboard.',
      },
    };
  }

  /**
   * Generate OpenAPI specification
   */
  static generateOpenApiSpec(): any {
    const doc = this.generateDocumentation();
    
    return {
      openapi: '3.0.0',
      info: doc.info,
      servers: doc.servers,
      tags: doc.tags,
      paths: this.convertEndpointsToOpenApiPaths(doc.endpoints),
      components: {
        schemas: doc.schemas,
        securitySchemes: doc.security,
      },
      security: [{ ApiKeyAuth: [] }],
    };
  }

  /**
   * Convert endpoints to OpenAPI paths format
   */
  private static convertEndpointsToOpenApiPaths(endpoints: ApiEndpoint[]): any {
    const paths: any = {};

    endpoints.forEach(endpoint => {
      if (!paths[endpoint.path]) {
        paths[endpoint.path] = {};
      }

      paths[endpoint.path][endpoint.method.toLowerCase()] = {
        summary: endpoint.summary,
        description: endpoint.description,
        tags: endpoint.tags,
        parameters: endpoint.parameters,
        requestBody: endpoint.requestBody,
        responses: this.convertResponsesToOpenApi(endpoint.responses),
        security: [{ ApiKeyAuth: [] }],
      };
    });

    return paths;
  }

  /**
   * Convert responses to OpenAPI format
   */
  private static convertResponsesToOpenApi(responses: ApiResponse[]): any {
    const openApiResponses: any = {};

    responses.forEach(response => {
      openApiResponses[response.statusCode.toString()] = {
        description: response.description,
        content: response.examples ? {
          'application/json': {
            examples: response.examples,
          },
        } : undefined,
      };
    });

    return openApiResponses;
  }

  /**
   * Get quick start guide
   */
  static getQuickStartGuide(): any {
    return {
      title: 'Quick Start Guide',
      steps: [
        {
          step: 1,
          title: 'Get Your API Key',
          description: 'Sign up for a Mas3ndi account and generate your API key from the dashboard.',
          code: 'Visit https://mas3ndi.com/dashboard/api-keys',
        },
        {
          step: 2,
          title: 'Make Your First API Call',
          description: 'Test your integration by sending a simple SMS.',
          code: `curl -X POST https://api.mas3ndi.com/v1/sms/send \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{
    "message": "Hello from Mas3ndi!",
    "recipients": ["+1234567890"],
    "senderId": "YourBrand"
  }'`,
        },
        {
          step: 3,
          title: 'Handle the Response',
          description: 'Process the API response to get message ID and delivery status.',
          code: `{
  "success": true,
  "message": "SMS sent successfully",
  "data": {
    "messageId": "msg_123456789",
    "cost": 0.02,
    "recipients": 1,
    "parts": 1
  }
}`,
        },
        {
          step: 4,
          title: 'Check Delivery Status',
          description: 'Monitor message delivery using the message ID.',
          code: `curl -X GET https://api.mas3ndi.com/v1/sms/status/msg_123456789 \\
  -H "x-api-key: YOUR_API_KEY"`,
        },
      ],
    };
  }

  /**
   * Get SDK information
   */
  static getSdkInfo(): any {
    return {
      title: 'Official SDKs',
      description: 'Use our official SDKs to integrate Mas3ndi into your applications quickly.',
      sdks: [
        {
          language: 'JavaScript/Node.js',
          package: '@mas3ndi/sdk-js',
          install: 'npm install @mas3ndi/sdk-js',
          github: 'https://github.com/mas3ndi/sdk-js',
          example: `import { Mas3ndi } from '@mas3ndi/sdk-js';

const client = new Mas3ndi('YOUR_API_KEY');

const result = await client.sms.send({
  message: 'Hello from Mas3ndi!',
  recipients: ['+1234567890'],
  senderId: 'YourBrand'
});`,
        },
        {
          language: 'Python',
          package: 'mas3ndi-python',
          install: 'pip install mas3ndi-python',
          github: 'https://github.com/mas3ndi/sdk-python',
          example: `from mas3ndi import Mas3ndi

client = Mas3ndi('YOUR_API_KEY')

result = client.sms.send(
    message='Hello from Mas3ndi!',
    recipients=['+1234567890'],
    sender_id='YourBrand'
)`,
        },
        {
          language: 'PHP',
          package: 'mas3ndi/sdk-php',
          install: 'composer require mas3ndi/sdk-php',
          github: 'https://github.com/mas3ndi/sdk-php',
          example: `<?php
use Mas3ndi\\Client;

$client = new Client('YOUR_API_KEY');

$result = $client->sms->send([
    'message' => 'Hello from Mas3ndi!',
    'recipients' => ['+1234567890'],
    'senderId' => 'YourBrand'
]);`,
        },
      ],
    };
  }

  /**
   * Get error codes documentation
   */
  static getErrorCodes(): any {
    return {
      title: 'Error Codes',
      description: 'Complete list of error codes and their meanings.',
      codes: [
        {
          code: 'INVALID_API_KEY',
          status: 401,
          description: 'The provided API key is invalid or expired.',
          solution: 'Check your API key and ensure it\'s active.',
        },
        {
          code: 'RATE_LIMIT_EXCEEDED',
          status: 429,
          description: 'You have exceeded your rate limit.',
          solution: 'Wait before making another request or upgrade your plan.',
        },
        {
          code: 'INSUFFICIENT_BALANCE',
          status: 400,
          description: 'Your account balance is insufficient for this operation.',
          solution: 'Add credits to your account.',
        },
        {
          code: 'INVALID_PHONE_NUMBER',
          status: 400,
          description: 'One or more phone numbers are invalid.',
          solution: 'Ensure phone numbers are in international format (+1234567890).',
        },
        {
          code: 'INVALID_SENDER_ID',
          status: 400,
          description: 'The sender ID is not approved or invalid.',
          solution: 'Use an approved sender ID or request approval for a new one.',
        },
        {
          code: 'MESSAGE_TOO_LONG',
          status: 400,
          description: 'The message exceeds the maximum length.',
          solution: 'Shorten your message or split it into multiple messages.',
        },
      ],
    };
  }
}
