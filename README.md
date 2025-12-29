# EAA - Enterprise Accreditation & Access Control System

**Version:** 0.0.1  
**Status:** Active Development  
**Architecture:** Modular Monolith with Hexagonal Architecture  
**Framework:** NestJS + TypeScript

---

## Overview

Enterprise-grade accreditation management and operational control system engineered for industrial and corporate environments requiring regulatory compliance, granular access control, and operational resilience.

### Core Capabilities

- **Document Control:** Document lifecycle management with multi-stage approval workflows
- **Physical Access Control:** Real-time policy evaluation with QR-based authentication
- **Vehicle Management:** Vehicle accreditation and access authorization
- **Cafeteria Control:** Meal entitlement management and consumption tracking
- **Multi-Tenancy:** Complete data isolation with tenant-aware operations
- **Audit Trail:** Comprehensive event logging with tamper-evident storage

---

## Architecture

### Design Principles

- **Modular Monolith:** Single deployable artifact with explicit module boundaries
- **Hexagonal Architecture:** Clean separation between domain, application, infrastructure, and interface layers
- **Remote-First Development:** No Docker required for local development
- **Cloud Portability:** Infrastructure abstracted behind port interfaces

### Module Structure

```
src/
├── modules/
│   ├── auth/          # Authentication & authorization
│   ├── health/        # Health check endpoints
│   └── [planned]      # documental, access, vehicle, casino
├── shared/            # Cross-cutting concerns
│   ├── decorators/    # Custom decorators
│   ├── filters/       # Exception filters
│   └── interceptors/  # Request/response interceptors
└── config/            # Configuration management
```

### Architectural Layers

- **Domain Layer:** Pure business logic, zero framework dependencies
- **Application Layer:** Use case orchestration, port interfaces
- **Infrastructure Layer:** Concrete implementations (database, storage, OIDC)
- **Interface Layer:** HTTP controllers, validators, presenters

> **Note:** See `AGENTS.md` for comprehensive architectural guidelines and engineering standards.

---

## Technology Stack

### Core Framework
- **NestJS 11.x** - Enterprise Node.js framework
- **TypeScript 5.x** - Type-safe development
- **RxJS 7.x** - Reactive programming

### Authentication & Security
- **OpenID Connect (OIDC)** - SSO authentication via Keycloak
- **jsonwebtoken** - JWT token handling
- **jwks-rsa** - JWKS key resolution

### Validation & Transformation
- **class-validator** - DTO validation
- **class-transformer** - Object transformation
- **Zod** - Schema validation

### API Documentation
- **@nestjs/swagger** - OpenAPI/Swagger integration

### Infrastructure (Remote Services)
- **PostgreSQL** - Primary data store (Railway)
- **S3-Compatible Storage** - Document repository (Railway Buckets)
- **Keycloak** - Identity provider (Railway)

---

## Getting Started

### Prerequisites

- **Node.js:** 18.x or higher
- **npm:** 9.x or higher
- **Remote Services:** Access to Railway infrastructure (PostgreSQL, S3, Keycloak)

### Installation

```bash
# Clone repository
git clone <repository-url>
cd eaa-nest-igris

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials
```

### Environment Configuration

Create a `.env` file based on `.env.example`:

```env
# Application
APP_ENV=development
PORT=3001
LOG_LEVEL=debug

# OIDC Authentication
OIDC_ISSUER_URL=https://your-keycloak-instance.com/realms/your-realm
OIDC_CLIENT_ID=your-client-id
OIDC_CLIENT_SECRET=your-client-secret
OIDC_REQUIRED=true

# Database
DATABASE_URL=postgresql://user:password@host:port/database

# S3-Compatible Storage
S3_ENDPOINT=https://your-s3-endpoint.com
S3_BUCKET=your-bucket-name
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
```

### Development

```bash
# Start development server with hot reload
npm run start:dev

# Start with debug mode
npm run start:debug

# Build for production
npm run build

# Start production server
npm run start:prod
```

### Testing

```bash
# Run unit tests
npm test

# Run tests in watch mode
npm test:watch

# Run tests with coverage
npm test:cov

# Run e2e tests
npm run test:e2e
```

### Code Quality

```bash
# Lint code
npm run lint

# Format code
npm run format
```

---

## API Documentation

Once the application is running, access the interactive API documentation:

- **Swagger UI:** `http://localhost:3001/api/docs`
- **OpenAPI Spec:** `http://localhost:3001/api/docs-json`

---

## Project Structure

```
eaa-hono-igris/
├── src/
│   ├── modules/              # Feature modules
│   │   ├── auth/            # Authentication module
│   │   │   ├── application/ # Use cases & ports
│   │   │   ├── domain/      # Domain entities
│   │   │   └── infrastructure/ # OIDC client
│   │   └── health/          # Health check module
│   ├── shared/              # Shared utilities
│   │   ├── decorators/      # @CurrentUser, etc.
│   │   ├── filters/         # Exception filters
│   │   └── interceptors/    # Logging, transform
│   ├── config/              # Configuration service
│   └── main.ts              # Application bootstrap
├── test/                    # E2E tests
├── docs/                    # Documentation
│   ├── AGENTS.md           # Architectural guidelines
│   └── hitos/              # Project milestones
├── .env.example            # Environment template
├── package.json            # Dependencies
└── tsconfig.json           # TypeScript config
```

---

## Development Philosophy

### Remote-First Architecture

This project adopts a **remote-first development model** that does not require Docker for local development.

**Benefits:**
- Hardware flexibility (supports low-memory laptops, ARM architectures)
- Faster onboarding without Docker Desktop licensing issues
- Development topology mirrors production cloud deployment
- Reduced local resource consumption

**Requirements:**
- Stable internet connectivity
- Access to remote infrastructure (Railway services)
- Environment variables properly configured

### Hexagonal Architecture

All infrastructure dependencies are abstracted behind **port interfaces**:

```typescript
// ✅ Domain/Application layers depend on ports
import { OidcClientPort } from '../application/ports/oidc-client.port';

// ❌ Never import concrete implementations in domain/application
import { OidcClient } from '../infrastructure/oidc.client';
```

This enables:
- **Testability:** Easy mocking of infrastructure
- **Cloud Portability:** Swap providers without changing business logic
- **Clean Architecture:** Clear separation of concerns

---

## Module Development Status

| Module | Status | Description |
|--------|--------|-------------|
| **auth** | ✅ Active | OIDC authentication, JWT validation |
| **health** | ✅ Active | Health check endpoints |
| **documental** | 🚧 Planned | Document lifecycle management |
| **access** | 🚧 Planned | Physical access control |
| **vehicle** | 🚧 Planned | Vehicle accreditation |
| **casino** | 🚧 Planned | Cafeteria/dining control |
| **reporting** | 🚧 Planned | Analytics and reporting |

---

## Key Architectural Patterns

### Multi-Tenancy
All database entities include `tenant_id` for complete data isolation:

```typescript
// ✅ Tenant-aware query
const document = await db.documents.findUnique({ 
  where: { 
    id: documentId,
    tenant_id: userContext.tenantId 
  } 
});
```

### Policy Evaluator
Deterministic authorization engine returning `ALLOW` or `DENY` with structured reason codes:

```typescript
interface EvaluationResult {
  decision: 'ALLOW' | 'DENY';
  reason_codes: string[]; // e.g., ['DOC_EXPIRED', 'OUTSIDE_TIME_WINDOW']
  evaluated_at: Date;
}
```

### Audit Trail
All critical operations generate immutable audit events:

```typescript
interface AuditEvent {
  id: string;
  timestamp: string;
  tenant_id: string;
  actor: ActorContext;
  action: string;
  outcome: 'SUCCESS' | 'FAILURE';
  reason_codes?: string[];
}
```

---

## Contributing

### Code Standards

1. **Follow Hexagonal Architecture:** Domain/application layers must not import infrastructure
2. **Port Interfaces:** All external dependencies behind port interfaces
3. **Multi-Tenancy:** Always filter by `tenant_id`
4. **Audit Logging:** Log all critical operations
5. **Reason Codes:** Use structured codes, not free-form text
6. **Type Safety:** Leverage TypeScript strictly

### Pull Request Checklist

- [ ] Code follows architectural guidelines in `AGENTS.md`
- [ ] Unit tests added/updated
- [ ] Integration tests for new features
- [ ] API documentation updated (Swagger annotations)
- [ ] Environment variables documented in `.env.example`
- [ ] No framework imports in domain/application layers

---

## Documentation

- **`AGENTS.md`** - Comprehensive architectural guidelines and engineering standards
- **`docs/hitos/`** - Project milestones and development phases
- **`docs/DEVELOPMENT_INFRA.md`** - Infrastructure setup and deployment

---

## License

UNLICENSED - Private/Proprietary

---

## Support

For questions or issues:
1. Review `AGENTS.md` for architectural guidance
2. Check API documentation at `/api/docs`
3. Contact the development team

---

**Built with ❤️ for enterprise-grade access control**
