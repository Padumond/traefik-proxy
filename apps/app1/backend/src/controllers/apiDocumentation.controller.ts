import { Request, Response, NextFunction } from 'express';
import { ApiDocumentationService } from '../services/apiDocumentation.service';
import { ApiError } from '../middleware/error.middleware';

export class ApiDocumentationController {
  /**
   * Get complete API documentation
   */
  static async getDocumentation(req: Request, res: Response, next: NextFunction) {
    try {
      const documentation = ApiDocumentationService.generateDocumentation();

      res.json({
        success: true,
        message: 'API documentation retrieved successfully',
        data: documentation,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get OpenAPI specification
   */
  static async getOpenApiSpec(req: Request, res: Response, next: NextFunction) {
    try {
      const spec = ApiDocumentationService.generateOpenApiSpec();

      // Set appropriate headers for OpenAPI spec
      res.set({
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });

      res.json(spec);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get Swagger UI HTML
   */
  static async getSwaggerUI(req: Request, res: Response, next: NextFunction) {
    try {
      const swaggerHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Mas3ndi API Documentation</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui.css" />
  <link rel="icon" type="image/png" href="https://mas3ndi.com/favicon.png" sizes="32x32" />
  <style>
    html {
      box-sizing: border-box;
      overflow: -moz-scrollbars-vertical;
      overflow-y: scroll;
    }
    *, *:before, *:after {
      box-sizing: inherit;
    }
    body {
      margin:0;
      background: #fafafa;
    }
    .swagger-ui .topbar {
      background-color: #2E507C;
    }
    .swagger-ui .topbar .download-url-wrapper .select-label {
      color: white;
    }
    .swagger-ui .info .title {
      color: #2E507C;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      const ui = SwaggerUIBundle({
        url: '/api/docs/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout",
        tryItOutEnabled: true,
        requestInterceptor: function(request) {
          // Add API key header if available
          const apiKey = localStorage.getItem('mas3ndi_api_key');
          if (apiKey) {
            request.headers['x-api-key'] = apiKey;
          }
          return request;
        },
        onComplete: function() {
          // Add API key input
          const topbar = document.querySelector('.topbar');
          if (topbar) {
            const apiKeyInput = document.createElement('div');
            apiKeyInput.innerHTML = \`
              <div style="display: flex; align-items: center; margin-left: 20px;">
                <label style="color: white; margin-right: 10px;">API Key:</label>
                <input 
                  type="password" 
                  id="api-key-input" 
                  placeholder="Enter your API key"
                  style="padding: 5px; border: none; border-radius: 3px;"
                  value="\${localStorage.getItem('mas3ndi_api_key') || ''}"
                />
                <button 
                  onclick="setApiKey()" 
                  style="margin-left: 10px; padding: 5px 10px; background: #48B4E3; color: white; border: none; border-radius: 3px; cursor: pointer;"
                >
                  Set
                </button>
              </div>
            \`;
            topbar.appendChild(apiKeyInput);
          }
        }
      });

      window.setApiKey = function() {
        const input = document.getElementById('api-key-input');
        if (input && input.value) {
          localStorage.setItem('mas3ndi_api_key', input.value);
          alert('API key set successfully! You can now test the endpoints.');
        }
      };
    };
  </script>
</body>
</html>`;

      res.set('Content-Type', 'text/html');
      res.send(swaggerHtml);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get quick start guide
   */
  static async getQuickStart(req: Request, res: Response, next: NextFunction) {
    try {
      const guide = ApiDocumentationService.getQuickStartGuide();

      res.json({
        success: true,
        message: 'Quick start guide retrieved successfully',
        data: guide,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get SDK information
   */
  static async getSdkInfo(req: Request, res: Response, next: NextFunction) {
    try {
      const sdkInfo = ApiDocumentationService.getSdkInfo();

      res.json({
        success: true,
        message: 'SDK information retrieved successfully',
        data: sdkInfo,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get error codes documentation
   */
  static async getErrorCodes(req: Request, res: Response, next: NextFunction) {
    try {
      const errorCodes = ApiDocumentationService.getErrorCodes();

      res.json({
        success: true,
        message: 'Error codes retrieved successfully',
        data: errorCodes,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Test API endpoint
   */
  static async testEndpoint(req: Request, res: Response, next: NextFunction) {
    try {
      const { endpoint, method, headers, body } = req.body;

      if (!endpoint || !method) {
        throw ApiError.badRequest('Endpoint and method are required');
      }

      // This would typically make a request to the specified endpoint
      // For now, return a mock response
      const mockResponse = {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'x-response-time': '150ms',
        },
        body: {
          success: true,
          message: 'Test request successful',
          data: {
            endpoint,
            method,
            timestamp: new Date().toISOString(),
          },
        },
      };

      res.json({
        success: true,
        message: 'API test completed',
        data: mockResponse,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get API status and health
   */
  static async getApiStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const status = {
        status: 'operational',
        version: '1.0.0',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        endpoints: {
          sms: 'operational',
          otp: 'operational',
          wallet: 'operational',
          analytics: 'operational',
        },
        rateLimit: {
          enabled: true,
          defaultLimit: '1000 requests/hour',
        },
        maintenance: {
          scheduled: false,
          nextWindow: null,
        },
      };

      res.json({
        success: true,
        message: 'API status retrieved successfully',
        data: status,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get API changelog
   */
  static async getChangelog(req: Request, res: Response, next: NextFunction) {
    try {
      const changelog = {
        title: 'API Changelog',
        description: 'Track changes and updates to the Mas3ndi API',
        versions: [
          {
            version: '1.0.0',
            date: '2024-01-01',
            type: 'major',
            changes: [
              'Initial API release',
              'SMS sending functionality',
              'OTP generation and verification',
              'Wallet balance management',
              'Rate limiting implementation',
            ],
          },
          {
            version: '0.9.0',
            date: '2023-12-15',
            type: 'minor',
            changes: [
              'Beta release',
              'Core SMS functionality',
              'Basic authentication',
            ],
          },
        ],
      };

      res.json({
        success: true,
        message: 'API changelog retrieved successfully',
        data: changelog,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Download Postman collection
   */
  static async getPostmanCollection(req: Request, res: Response, next: NextFunction) {
    try {
      const collection = {
        info: {
          name: 'Mas3ndi API',
          description: 'Complete Mas3ndi API collection for Postman',
          version: '1.0.0',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        },
        auth: {
          type: 'apikey',
          apikey: [
            {
              key: 'key',
              value: 'x-api-key',
              type: 'string',
            },
            {
              key: 'value',
              value: '{{API_KEY}}',
              type: 'string',
            },
          ],
        },
        variable: [
          {
            key: 'BASE_URL',
            value: 'https://api.mas3ndi.com',
            type: 'string',
          },
          {
            key: 'API_KEY',
            value: 'YOUR_API_KEY_HERE',
            type: 'string',
          },
        ],
        item: [
          {
            name: 'SMS',
            item: [
              {
                name: 'Send SMS',
                request: {
                  method: 'POST',
                  header: [
                    {
                      key: 'Content-Type',
                      value: 'application/json',
                    },
                  ],
                  url: {
                    raw: '{{BASE_URL}}/v1/sms/send',
                    host: ['{{BASE_URL}}'],
                    path: ['v1', 'sms', 'send'],
                  },
                  body: {
                    mode: 'raw',
                    raw: JSON.stringify({
                      message: 'Hello from Mas3ndi!',
                      recipients: ['+1234567890'],
                      senderId: 'YourBrand',
                    }, null, 2),
                  },
                },
              },
            ],
          },
        ],
      };

      res.set({
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="mas3ndi-api.postman_collection.json"',
      });

      res.json(collection);
    } catch (error) {
      next(error);
    }
  }
}
