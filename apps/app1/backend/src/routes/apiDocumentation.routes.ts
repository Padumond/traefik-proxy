import { Router } from "express";
import { ApiDocumentationController } from "../controllers/apiDocumentation.controller";
import { validateRequest } from "../middleware/validation.middleware";
const expressValidator = require("express-validator");
const { body } = expressValidator;

const router = Router();

// Validation schemas
const testEndpointValidation = [
  body("endpoint")
    .isString()
    .trim()
    .isLength({ min: 1 })
    .withMessage("Endpoint is required"),
  body("method")
    .isString()
    .trim()
    .isIn(["GET", "POST", "PUT", "DELETE", "PATCH"])
    .withMessage("Valid HTTP method is required"),
  body("headers")
    .optional()
    .isObject()
    .withMessage("Headers must be an object"),
  body("body").optional().withMessage("Body can be any valid JSON"),
];

/**
 * @route GET /api/docs
 * @desc Get Swagger UI documentation page
 * @access Public
 */
router.get("/", ApiDocumentationController.getSwaggerUI);

/**
 * @route GET /api/docs/openapi.json
 * @desc Get OpenAPI specification
 * @access Public
 */
router.get("/openapi.json", ApiDocumentationController.getOpenApiSpec);

/**
 * @route GET /api/docs/json
 * @desc Get complete API documentation in JSON format
 * @access Public
 */
router.get("/json", ApiDocumentationController.getDocumentation);

/**
 * @route GET /api/docs/quick-start
 * @desc Get quick start guide
 * @access Public
 */
router.get("/quick-start", ApiDocumentationController.getQuickStart);

/**
 * @route GET /api/docs/sdks
 * @desc Get SDK information and examples
 * @access Public
 */
router.get("/sdks", ApiDocumentationController.getSdkInfo);

/**
 * @route GET /api/docs/errors
 * @desc Get error codes documentation
 * @access Public
 */
router.get("/errors", ApiDocumentationController.getErrorCodes);

/**
 * @route GET /api/docs/status
 * @desc Get API status and health information
 * @access Public
 */
router.get("/status", ApiDocumentationController.getApiStatus);

/**
 * @route GET /api/docs/changelog
 * @desc Get API changelog
 * @access Public
 */
router.get("/changelog", ApiDocumentationController.getChangelog);

/**
 * @route GET /api/docs/postman
 * @desc Download Postman collection
 * @access Public
 */
router.get("/postman", ApiDocumentationController.getPostmanCollection);

/**
 * @route POST /api/docs/test
 * @desc Test API endpoint
 * @access Public
 */
router.post(
  "/test",
  testEndpointValidation,
  validateRequest,
  ApiDocumentationController.testEndpoint
);

export default router;
