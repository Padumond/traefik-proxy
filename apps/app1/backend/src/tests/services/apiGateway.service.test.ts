import { ApiGatewayService } from '../../services/apiGateway.service';
import { ApiKeyService } from '../../services/apiKey.service';

// Mock ApiKeyService
jest.mock('../../services/apiKey.service');
const mockedApiKeyService = ApiKeyService as jest.Mocked<typeof ApiKeyService>;

describe('ApiGatewayService', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    // Re-initialize routes for each test
    ApiGatewayService.initializeRoutes();
  });

  describe('Route Registration and Matching', () => {
    it('should register and find SMS send route', () => {
      const route = ApiGatewayService.findRoute('POST', '/v1/sms/send');
      
      expect(route).toBeTruthy();
      expect(route?.mapping.controller).toBe('ClientSmsController');
      expect(route?.mapping.action).toBe('sendSms');
      expect(route?.mapping.permissions).toContain('sms:send');
    });

    it('should find route with parameters', () => {
      const route = ApiGatewayService.findRoute('GET', '/v1/sms/status/msg_123456');
      
      expect(route).toBeTruthy();
      expect(route?.mapping.pattern).toBe('/v1/sms/status/:messageId');
      expect(route?.params.messageId).toBe('msg_123456');
    });

    it('should return null for non-existent routes', () => {
      const route = ApiGatewayService.findRoute('GET', '/v1/nonexistent/route');
      
      expect(route).toBeNull();
    });

    it('should match method-specific routes', () => {
      const postRoute = ApiGatewayService.findRoute('POST', '/v1/sms/send');
      const getRoute = ApiGatewayService.findRoute('GET', '/v1/sms/send');
      
      expect(postRoute).toBeTruthy();
      expect(getRoute).toBeNull();
    });
  });

  describe('Route Parameter Extraction', () => {
    it('should extract single parameter', () => {
      const route = ApiGatewayService.findRoute('GET', '/v1/sms/status/msg_123456');
      
      expect(route?.params).toEqual({
        messageId: 'msg_123456'
      });
    });

    it('should extract multiple parameters', () => {
      // Register a test route with multiple parameters
      ApiGatewayService.registerRoute({
        pattern: '/v1/users/:userId/messages/:messageId',
        method: 'GET',
        controller: 'TestController',
        action: 'getTest',
        permissions: ['test:read'],
      });

      const route = ApiGatewayService.findRoute('GET', '/v1/users/user123/messages/msg456');
      
      expect(route?.params).toEqual({
        userId: 'user123',
        messageId: 'msg456'
      });
    });

    it('should handle routes without parameters', () => {
      const route = ApiGatewayService.findRoute('GET', '/v1/wallet/balance');
      
      expect(route?.params).toEqual({});
    });
  });

  describe('Request Validation', () => {
    const mockRequest = {
      apiKeyInfo: {
        userId: 'user123',
        apiKeyId: 'key123',
        permissions: ['sms:send', 'wallet:read'],
        rateLimit: 1000,
      },
    } as any;

    it('should validate request with sufficient permissions', () => {
      const mapping = {
        permissions: ['sms:send'],
        controller: 'ClientSmsController',
        action: 'sendSms',
        pattern: '/v1/sms/send',
        method: 'POST',
      };

      mockedApiKeyService.hasPermission.mockReturnValue(true);

      const result = ApiGatewayService.validateRequest(mockRequest, mapping);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject request with insufficient permissions', () => {
      const mapping = {
        permissions: ['admin:write'],
        controller: 'AdminController',
        action: 'deleteUser',
        pattern: '/v1/admin/users',
        method: 'DELETE',
      };

      mockedApiKeyService.hasPermission.mockReturnValue(false);

      const result = ApiGatewayService.validateRequest(mockRequest, mapping);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Insufficient permissions');
    });

    it('should reject request without API key info', () => {
      const requestWithoutAuth = {} as any;
      const mapping = {
        permissions: ['sms:send'],
        controller: 'ClientSmsController',
        action: 'sendSms',
        pattern: '/v1/sms/send',
        method: 'POST',
      };

      const result = ApiGatewayService.validateRequest(requestWithoutAuth, mapping);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('API key authentication required');
    });
  });

  describe('Request Transformation', () => {
    const mockRequest = {
      path: '/v1/sms/status/msg123',
      params: {},
      headers: {},
      body: { message: 'test' },
      query: { limit: '10' },
      apiKeyInfo: {
        userId: 'user123',
        apiKeyId: 'key123',
        permissions: ['sms:send'],
        rateLimit: 1000,
      },
    } as any;

    const mockMapping = {
      pattern: '/v1/sms/status/:messageId',
      controller: 'ClientSmsController',
      action: 'getSmsStatus',
      permissions: ['sms:status'],
      method: 'GET',
    };

    const params = { messageId: 'msg123' };

    it('should transform request with route parameters', () => {
      ApiGatewayService.transformRequest(mockRequest, mockMapping, params);

      expect(mockRequest.params.messageId).toBe('msg123');
      expect(mockRequest.gatewayInfo).toBeDefined();
      expect(mockRequest.gatewayInfo?.originalRoute).toBe('/v1/sms/status/msg123');
      expect(mockRequest.gatewayInfo?.mappedRoute).toBe('/v1/sms/status/:messageId');
    });

    it('should add gateway headers', () => {
      ApiGatewayService.transformRequest(mockRequest, mockMapping, params);

      expect(mockRequest.headers['x-user-id']).toBe('user123');
      expect(mockRequest.headers['x-api-key-id']).toBe('key123');
      expect(mockRequest.headers['x-request-id']).toBeDefined();
    });

    it('should transform request body', () => {
      ApiGatewayService.transformRequest(mockRequest, mockMapping, params);

      expect(mockRequest.body.userId).toBe('user123');
      expect(mockRequest.body._gateway).toBeDefined();
      expect(mockRequest.body._gateway.apiKeyId).toBe('key123');
    });
  });

  describe('Route Documentation', () => {
    it('should generate route documentation', () => {
      const docs = ApiGatewayService.getRouteDocumentation();

      expect(docs).toBeInstanceOf(Array);
      expect(docs.length).toBeGreaterThan(0);

      const smsRoute = docs.find(doc => doc.pattern === '/v1/sms/send');
      expect(smsRoute).toBeDefined();
      expect(smsRoute?.method).toBe('POST');
      expect(smsRoute?.permissions).toContain('sms:send');
    });

    it('should include parameter information for parameterized routes', () => {
      const docs = ApiGatewayService.getRouteDocumentation();
      
      const statusRoute = docs.find(doc => doc.pattern === '/v1/sms/status/:messageId');
      expect(statusRoute).toBeDefined();
      expect(statusRoute?.parameters).toBeDefined();
      expect(statusRoute?.parameters?.messageId).toBe('string');
    });

    it('should sort routes alphabetically', () => {
      const docs = ApiGatewayService.getRouteDocumentation();
      
      for (let i = 1; i < docs.length; i++) {
        expect(docs[i].pattern.localeCompare(docs[i - 1].pattern)).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Health Check', () => {
    it('should return health status', () => {
      const health = ApiGatewayService.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.routesRegistered).toBeGreaterThan(0);
      expect(health.timestamp).toBeDefined();
      expect(new Date(health.timestamp)).toBeInstanceOf(Date);
    });
  });

  describe('Custom Route Registration', () => {
    it('should register custom routes', () => {
      const customRoute = {
        pattern: '/v1/custom/test',
        method: 'POST',
        controller: 'CustomController',
        action: 'customAction',
        permissions: ['custom:test'],
      };

      ApiGatewayService.registerRoute(customRoute);

      const route = ApiGatewayService.findRoute('POST', '/v1/custom/test');
      expect(route).toBeTruthy();
      expect(route?.mapping.controller).toBe('CustomController');
    });

    it('should override existing routes when registering with same pattern and method', () => {
      const originalRoute = {
        pattern: '/v1/test/override',
        method: 'GET',
        controller: 'OriginalController',
        action: 'originalAction',
        permissions: ['test:read'],
      };

      const newRoute = {
        pattern: '/v1/test/override',
        method: 'GET',
        controller: 'NewController',
        action: 'newAction',
        permissions: ['test:write'],
      };

      ApiGatewayService.registerRoute(originalRoute);
      ApiGatewayService.registerRoute(newRoute);

      const route = ApiGatewayService.findRoute('GET', '/v1/test/override');
      expect(route?.mapping.controller).toBe('NewController');
      expect(route?.mapping.action).toBe('newAction');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty path', () => {
      const route = ApiGatewayService.findRoute('GET', '');
      expect(route).toBeNull();
    });

    it('should handle path with trailing slash', () => {
      const route = ApiGatewayService.findRoute('GET', '/v1/wallet/balance/');
      expect(route).toBeNull(); // Should not match unless explicitly registered
    });

    it('should handle case sensitivity', () => {
      const route = ApiGatewayService.findRoute('get', '/v1/wallet/balance');
      expect(route).toBeNull(); // Method should be case sensitive
    });

    it('should handle special characters in parameters', () => {
      const route = ApiGatewayService.findRoute('GET', '/v1/sms/status/msg_123-456.789');
      expect(route?.params.messageId).toBe('msg_123-456.789');
    });
  });
});
