import { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cors from "cors";

// General rate limiting middleware
export const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"), // Default: 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX || "100"), // Default: 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

// Strict rate limiting for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many authentication attempts, please try again later.",
  },
  skipSuccessfulRequests: true, // Don't count successful requests
});

// Rate limiting for SMS sending
export const smsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 SMS requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many SMS requests, please try again later." },
});

// Rate limiting for password reset
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 password reset requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many password reset attempts, please try again later.",
  },
});

// CORS configuration - Secure configuration
export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Get allowed origins from environment variable
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",").map((o) =>
      o.trim()
    ) || ["http://localhost:3001", "http://localhost:3000"];

    if (allowedOrigins.includes(origin)) {
      // Return the actual origin instead of true to set Access-Control-Allow-Origin header
      return callback(null, origin);
    } else {
      console.error(
        `CORS blocked origin: ${origin}. Allowed: ${allowedOrigins.join(", ")}`
      );
      return callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
    "Access-Control-Request-Method",
    "Access-Control-Request-Headers",
    "X-API-Key",
  ],
  optionsSuccessStatus: 200,
});

// Enhanced Helmet security middleware
export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://sms.arkesel.com"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for API compatibility
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  xssFilter: true,
  noSniff: true,
  frameguard: { action: "deny" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
});

// HTTPS enforcement middleware
// NOTE: When running behind Traefik reverse proxy, Traefik handles HTTPS termination.
// The app receives HTTP traffic from Traefik, so we check x-forwarded-proto header.
export const httpsEnforcement = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Skip HTTPS enforcement in development
  if (process.env.NODE_ENV === "development") {
    return next();
  }

  // Skip HTTPS enforcement for health check endpoint (used by Docker healthcheck)
  if (req.path === "/health") {
    return next();
  }

  // When behind a reverse proxy like Traefik, trust the x-forwarded-proto header
  // Traefik terminates SSL and forwards HTTP to containers
  const proto = req.get("x-forwarded-proto");
  if (proto && proto !== "https") {
    return res.redirect(301, `https://${req.get("host")}${req.url}`);
  }

  next();
};

// Request validation middleware
export const validateRequestBody = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: "Validation error",
          details: error.details.map((detail: any) => detail.message),
        });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
};

// API key validation middleware
export const validateApiKey = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const apiKey = req.headers["x-api-key"];

    if (!apiKey) {
      return res.status(401).json({ error: "API key is required" });
    }

    // Here you would typically validate the API key against your database
    // For now, we'll just check if it exists
    // In a real implementation, you'd query the database to verify the API key

    next();
  } catch (err) {
    next(err);
  }
};

// Apply all security middleware
export const applySecurityMiddleware = (app: any) => {
  // HTTPS enforcement (first middleware)
  app.use(httpsEnforcement);

  // Security headers
  app.use(helmetMiddleware);

  // CORS configuration
  app.use(corsMiddleware);

  // General rate limiting for all API routes
  app.use("/api/", limiter);

  // Specific rate limiting for sensitive endpoints
  app.use("/api/auth/login", authLimiter);
  app.use("/api/auth/register", authLimiter);
  app.use("/api/auth/forgot-password", passwordResetLimiter);
  app.use("/api/sms/send", smsLimiter);
  app.use("/api/sms/send-bulk", smsLimiter);
};
