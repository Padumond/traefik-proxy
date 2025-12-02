# Mas3ndi Backend

This is the backend service for the Mas3ndi Bulk SMS Reseller Platform. It provides API endpoints for user authentication, SMS messaging, wallet management, sender ID verification, and more.

## Tech Stack

- **Node.js** with **TypeScript**
- **Express.js** for API routing
- **PostgreSQL** database with **Prisma ORM**
- **Redis** for queue management with **BullMQ**
- **JWT** for authentication
- **Docker** for containerization

## Getting Started

### Prerequisites

- Node.js (v16+)
- Docker and Docker Compose
- PostgreSQL (local or Docker)
- Redis (local or Docker)

### Environment Setup

1. Copy the example environment file:

```bash
cp .env.example .env
```

2. Update the environment variables in `.env` with your configuration:

```
DATABASE_URL="postgresql://username:password@localhost:5432/mas3ndi?schema=public"
JWT_SECRET="your-jwt-secret-key"
```

### Development with Docker

The easiest way to start development is using Docker Compose:

```bash
# From the project root directory
docker-compose -f docker-compose.dev.yml up -d
```

This will start:
- PostgreSQL database
- Redis instance
- Backend service with hot reloading

### Manual Development Setup

1. Install dependencies:

```bash
npm install
```

2. Generate Prisma client:

```bash
npm run prisma:generate
```

3. Run database migrations:

```bash
npm run prisma:migrate
```

4. Start the development server:

```bash
npm run dev
```

## API Documentation

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user information

### SMS Management

- `POST /api/sms/send` - Send an SMS message
- `GET /api/sms/history` - Get SMS history
- `POST /api/sms/schedule` - Schedule an SMS message
- `GET /api/sms/scheduled` - Get scheduled messages
- `DELETE /api/sms/schedule/:id` - Cancel a scheduled message

### Wallet Management

- `GET /api/wallet/balance` - Get wallet balance
- `GET /api/wallet/transactions` - Get transaction history
- `POST /api/wallet/topup` - Add funds to wallet

### Sender ID Management

- `GET /api/sender-ids` - Get all sender IDs
- `POST /api/sender-ids` - Request a new sender ID
- `GET /api/sender-ids/:id` - Get sender ID details

### Message Templates

- `GET /api/templates` - Get all message templates
- `GET /api/templates/:id` - Get template by ID
- `POST /api/templates` - Create a new template
- `PUT /api/templates/:id` - Update a template
- `DELETE /api/templates/:id` - Delete a template

### Contact Groups

- `GET /api/contacts/groups` - Get all contact groups
- `GET /api/contacts/groups/:id` - Get group by ID
- `POST /api/contacts/groups` - Create a new group
- `PUT /api/contacts/groups/:id` - Update a group
- `DELETE /api/contacts/groups/:id` - Delete a group
- `POST /api/contacts/groups/:id/contacts` - Add contacts to group
- `DELETE /api/contacts/groups/:id/contacts/:contactId` - Remove contact from group

## Security Features

The backend implements several security features:

1. **JWT Authentication** - Secure API endpoints with JWT tokens
2. **Helmet** - HTTP header security
3. **CORS Protection** - Configurable CORS policy
4. **Rate Limiting** - Prevent abuse with request rate limiting
5. **Input Validation** - Validate all incoming requests
6. **API Key Authentication** - For client API access

## Database Schema

The database schema is defined using Prisma and includes the following models:

- User
- Wallet
- Transaction
- SenderId
- Message
- ScheduledMessage
- MessageTemplate
- Contact
- ContactGroup

View the complete schema in `prisma/schema.prisma`.

## Queue Management

The application uses BullMQ with Redis for managing background tasks:

- SMS sending queue
- Scheduled message processing
- Webhook delivery

## Testing

Run tests with:

```bash
npm test
```

## Production Deployment

For production deployment, use the production Docker Compose file:

```bash
docker-compose up -d
```

This will build optimized images and configure the services for production use.

## Contributing

1. Follow the coding style and conventions
2. Write tests for new features
3. Update documentation as needed
4. Create pull requests for review
