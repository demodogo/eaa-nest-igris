# AGENTS.md — Architectural Guidelines and Engineering Standards

**Status:** Active (Baseline)  
**Last Updated:** 2025-12-27  
**Version:** 1.0.0  
**Classification:** Internal Technical Documentation

---

## Document Purpose and Scope

This document establishes the architectural directives, technical standards, and engineering principles governing system development. It serves as the authoritative reference for:

- **Developer Onboarding:** Accelerating integration of new team members into the technical ecosystem
- **AI Agent Context:** Providing comprehensive architectural context to IDE assistants and code generation agents
- **Code Quality Assurance:** Ensuring consistency, maintainability, and adherence to established patterns
- **Contract Integrity:** Maintaining immutability of business rules and interface contracts

### Governance Model

**Architectural Invariant:** All modifications to architectural patterns or business rules MUST be documented through Architecture Decision Records (ADR) and reflected in this document, maintaining complete traceability and audit trail.

---

## 1. System Overview

### 1.1 Product Vision

Enterprise-grade accreditation management and operational control system engineered for industrial and corporate environments requiring:
- **Regulatory Compliance:** Full traceability and audit capabilities
- **Granular Access Control:** Multi-layered authorization with ABAC (Attribute-Based Access Control)
- **Operational Resilience:** High availability and fault tolerance
- **Scalability:** Multi-tenant architecture supporting concurrent organizational hierarchies

### 1.2 Functional Domain Modules

#### 1.2.1 Document Control Module
**Domain Responsibility:** Management of documentary requirements for organizations and personnel

**Core Capabilities:**
- Document folder lifecycle management with state machine transitions
- Multi-stage workflow orchestration (upload → review → approval/rejection)
- Expiration engine with configurable notification thresholds (T-30, T-15, T-7)
- Automated accreditation certificate generation with cryptographic signatures

**Implementation Considerations:**
- Document versioning strategy required (suggested: semantic versioning with immutable history)
- Retention policy enforcement per regulatory requirements
- Support for multiple document formats with virus scanning integration
- OCR capability for automated data extraction from scanned documents

#### 1.2.2 Physical Access Control Module
**Domain Responsibility:** Real-time evaluation and event logging for personnel access

**Core Capabilities:**
- Deterministic policy evaluation engine (binary ALLOW/DENY decisions)
- Ingress/egress event stream with millisecond-precision timestamps
- Dual authentication mechanism support:
  - Standard QR code resolution (low-trust, online validation required)
  - Cryptographically signed QR tokens (high-trust, offline-capable with TTL)
- Future integration points for biometric systems (fingerprint, facial recognition)

**Implementation Considerations:**
- Event sourcing pattern recommended for access logs (immutable append-only)
- Circuit breaker pattern for external identity provider calls
- Offline mode support with eventual consistency reconciliation
- WebSocket/SSE for real-time access event notifications to security dashboards

#### 1.2.3 Vehicle Control Module
**Domain Responsibility:** Vehicle accreditation and access authorization

**Core Capabilities:**
- Vehicle registration and accreditation workflow
- License plate recognition (LPR) integration readiness
- Access permission evaluation with temporal constraints
- Vehicle event logging with geospatial data support

**Implementation Considerations:**
- Integration with third-party LPR systems via adapter pattern
- Support for temporary vehicle permits with automatic expiration
- Vehicle-to-driver association tracking with validation
- Integration with parking management systems

#### 1.2.4 Cafeteria/Dining Control Module
**Domain Responsibility:** Meal entitlement management and consumption tracking

**Core Capabilities:**
- Temporal window validation for meal service periods
- Idempotency enforcement (duplicate consumption prevention)
- Consumption event recording with nutritional metadata
- Future analytics capabilities (dietary tracking, cost allocation)

**Implementation Considerations:**
- Idempotency key generation strategy (user_id + date + meal_type)
- Support for multiple meal types and dietary restrictions
- Integration with point-of-sale systems
- Meal credit system for flexible consumption patterns

#### 1.2.5 Core (Cross-Cutting Concerns)
**Domain Responsibility:** Foundational services and infrastructure

**Core Components:**
- **Multi-Tenancy Engine:** Complete data isolation with tenant-aware query filtering
- **Identity and Access Management:** User provisioning, role management, ABAC policy engine
- **Audit Subsystem:** Comprehensive event logging with tamper-evident storage
- **Configuration Management:** Feature flags, tenant-specific settings, runtime parameters
- **Notification Service:** Multi-channel delivery (email, SMS, push, webhook)
- **Reporting and Analytics:** Data aggregation, visualization, and export capabilities

**Implementation Considerations:**
- Tenant isolation at database level (schema-per-tenant vs row-level security trade-off)
- Audit log retention with archival strategy (hot storage: 90 days, cold storage: 7 years)
- Configuration hot-reload without service restart
- Rate limiting and quota management per tenant

---

## 2. Development and Deployment Strategy

### 2.1 Development Philosophy: Remote-First Architecture

**Strategic Decision:** The project adopts a **remote-first development model** that explicitly does not assume Docker availability in local development environments.

**Rationale:**
- **Hardware Flexibility:** Accommodates diverse developer workstation configurations (low-memory laptops, ARM architectures)
- **Resource Optimization:** Eliminates container orchestration overhead on development machines
- **Cloud Alignment:** Development topology mirrors production cloud deployment patterns
- **Reduced Friction:** Faster onboarding without Docker Desktop licensing or virtualization issues

**Execution Strategy:**
- **Backend Runtime:** Native execution via Node.js/Python interpreter
- **Configuration Management:** Environment-specific `.env` files (never committed to VCS)
- **Heavy Dependencies:** Remote provisioning of databases, object storage, and identity providers

**Trade-offs:**
- Requires stable internet connectivity for development
- Shared development resources may experience contention
- Local debugging of infrastructure components requires VPN/tunneling

### 2.2 Service Topology

#### 2.2.1 Development and QA Environments

| Service Category | Primary Provider | Alternatives | Purpose | Notes |
|-----------------|------------------|--------------|---------|-------|
| **Relational Database** | Railway PostgreSQL | Neon, Supabase, AWS RDS | Primary data store | Connection pooling via PgBouncer recommended |
| **Object Storage** | Railway Buckets | MinIO, AWS S3, Cloudflare R2 | Document repository | S3-compatible API required |
| **Identity Provider** | Keycloak (Railway) | DevAuth (local), Auth0, AWS Cognito | SSO/OIDC authentication | SAML support for enterprise SSO |
| **Cache Layer** | Railway Redis | Upstash, AWS ElastiCache | Session storage, rate limiting | *Planned implementation* |
| **Message Queue** | Railway RabbitMQ | AWS SQS, Google Pub/Sub | Async job processing | *Planned implementation* |

#### 2.2.2 Cloud Portability Principle

**Architectural Constraint:** All infrastructure components MUST be abstracted behind adapter interfaces, enabling provider migration without business logic modification.

**Migration Path Example:**
```
Railway → AWS Migration
├─ PostgreSQL → RDS (connection string change only)
├─ Buckets → S3 (adapter configuration change)
├─ Keycloak → Cognito (OIDC adapter swap)
├─ Redis → ElastiCache (connection string change)
└─ RabbitMQ → SQS (queue adapter implementation)
```

**Implementation Requirement:** All adapters MUST implement standardized port interfaces defined in `application/ports/`.

---

## 3. Architectural Pattern: Modular Monolith with Hexagonal Architecture

### 3.1 Modular Monolith Definition

**Pattern:** Single deployable artifact with explicit internal module boundaries enforcing separation of concerns.

**Module Inventory:**
- `core` — Cross-cutting concerns and shared kernel
- `documental` — Document management domain
- `access` — Physical access control domain
- `vehicle` — Vehicle management domain
- `casino` — Cafeteria/dining domain
- `reporting` — Analytics and reporting domain

**Enforcement Mechanism:**
- Modules MUST NOT directly access other modules' database tables or infrastructure clients
- Inter-module communication MUST occur through well-defined internal APIs or domain events
- Dependency graph MUST be acyclic (no circular dependencies between modules)

**Rationale for Monolith:**
- Simplified deployment and operational overhead
- Transactional consistency across modules without distributed transactions
- Easier debugging and distributed tracing
- Future microservice extraction path preserved through module boundaries

### 3.2 Hexagonal Architecture (Ports and Adapters)

**Layer Definitions:**

#### Domain Layer
- **Responsibility:** Pure business logic and domain entities
- **Constraints:** 
  - Zero dependencies on frameworks or infrastructure
  - No I/O operations (database, network, filesystem)
  - Fully unit-testable without mocks
- **Contains:** Entities, value objects, domain services, domain events

#### Application Layer
- **Responsibility:** Use case orchestration and workflow coordination
- **Constraints:**
  - Depends on domain layer and port interfaces only
  - No knowledge of concrete infrastructure implementations
- **Contains:** Use cases, command/query handlers, DTOs, port interfaces

#### Infrastructure Layer
- **Responsibility:** Concrete implementations of port interfaces
- **Constraints:**
  - Implements port interfaces defined in application layer
  - Contains all framework-specific and third-party library code
- **Contains:** Database repositories, HTTP clients, message queue adapters, email services

#### Interface/Transport Layer
- **Responsibility:** External communication protocols
- **Constraints:**
  - Translates external requests to application layer commands/queries
  - Handles serialization, validation, and error formatting
- **Contains:** HTTP controllers, GraphQL resolvers, CLI commands, event subscribers

**Architectural Invariant:** Domain layer MUST NOT import from infrastructure layer. Dependency direction: Interface → Application → Domain ← Infrastructure.

**Implementation Suggestion:**
```typescript
// ❌ PROHIBITED in domain layer
import { S3Client } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';

// ✅ ALLOWED in domain layer
import { StoragePort } from '@application/ports/storage.port';
import { DocumentRepository } from '@application/ports/document.repository';
```

---

## 4. Backend Directory Structure

**Framework Agnostic Principle:** While specific frameworks may impose conventions, the conceptual layer separation MUST remain consistent.

**Recommended Structure (Node.js/TypeScript):**

```
/apps
  /api
    /src
      /domain                    # Pure business logic
        /core
          /entities
          /value-objects
          /domain-services
          /domain-events
        /documental
        /access
        /vehicle
        /casino
        /shared                  # Shared kernel (common types, utilities)
      
      /application               # Use cases and orchestration
        /use-cases
          /documental
          /access
          /vehicle
          /casino
        /ports                   # Interface definitions
          storage.port.ts
          identity.port.ts
          audit.port.ts
          notification.port.ts
          clock.port.ts
        /dto                     # Data transfer objects
        /mappers                 # Domain ↔ DTO transformations
      
      /infra                     # Concrete implementations
        /db
          /repositories
          /migrations
          /seeds
        /storage
          s3-compatible.adapter.ts
        /identity
          oidc.adapter.ts
          dev-auth.adapter.ts
        /notifications
          console.adapter.ts
          ses.adapter.ts
        /jobs
          /schedulers
          /workers
        /cache
          redis.adapter.ts
      
      /interfaces                # External communication
        /http
          /middlewares
            auth.middleware.ts
            tenant.middleware.ts
            correlation-id.middleware.ts
          /controllers
          /validators
          /presenters            # Response formatting
        /cli
        /events                  # Event subscribers
      
      main.ts                    # Application bootstrap
    
    /tests
      /unit
      /integration
      /e2e
      /fixtures
    
    package.json
    tsconfig.json
    .env.example

/docs
  AGENTS.md
  00_INDEX.md
  /architecture
    /arc42
    /c4-models
    /erd
  /requirements
    /srs
    /nfr
  /contracts
    /api-contracts
    /policy-specifications
  /adrs
    0000_ADR_TEMPLATE.md
    0001_hexagonal_architecture.md
    0002_remote_first_development.md

/openapi
  api.v1.yaml
  api.v2.yaml

/scripts
  /db
  /deployment
```

**Enforcement Rule:** `domain/` and `application/` directories MUST NOT contain imports from NestJS, Fastify, Express, FastAPI, or any web framework.

**Implementation Suggestion:**
- Use ESLint/TSLint rules to enforce import restrictions:
```json
{
  "rules": {
    "no-restricted-imports": ["error", {
      "patterns": [{
        "group": ["@nestjs/*", "express", "fastify"],
        "message": "Framework imports not allowed in domain/application layers"
      }]
    }]
  }
}
```

---

## 5. Port Interfaces (Stable Contracts)

**Change Management Policy:** Port interfaces defined in `application/ports/` are **stable contracts**. Modifications require:
1. Architecture Decision Record (ADR) documenting rationale
2. Impact analysis on all implementing adapters
3. Comprehensive test coverage for new contract
4. Deprecation period for breaking changes

### 5.1 StoragePort (Document Management)

**Interface Definition:**
```typescript
interface StoragePort {
  /**
   * Upload object to storage with metadata
   * @throws StorageError if upload fails
   */
  putObject(params: PutObjectParams): Promise<PutObjectResult>;
  
  /**
   * Generate presigned URL for client-side upload
   * @param method - HTTP method (PUT or POST)
   * @param expiresIn - URL validity duration in seconds
   */
  getPresignedUploadUrl(params: PresignedUploadParams): Promise<PresignedUrl>;
  
  /**
   * Generate presigned URL for secure download
   * @param expiresIn - URL validity duration in seconds (default: 3600)
   */
  getPresignedDownloadUrl(params: PresignedDownloadParams): Promise<PresignedUrl>;
  
  /**
   * Delete object from storage
   * @throws StorageError if deletion fails or object not found
   */
  deleteObject(params: DeleteObjectParams): Promise<void>;
  
  /**
   * Check if object exists
   */
  objectExists(params: ObjectExistsParams): Promise<boolean>;
  
  /**
   * Get object metadata without downloading content
   */
  getObjectMetadata(params: GetMetadataParams): Promise<ObjectMetadata>;
}
```

**Concrete Implementations:**
- `S3CompatibleStorageAdapter` — AWS SDK v3 for S3, Railway Buckets, MinIO
- `AzureBlobStorageAdapter` — Azure Blob Storage (future)
- `GCSStorageAdapter` — Google Cloud Storage (future)

**Implementation Suggestion:**
- Add `copyObject()` method for document versioning
- Add `listObjects()` with pagination for folder browsing
- Implement retry logic with dead-letter queue for failed operations

### 5.2 IdentityPort (Authentication and Authorization)

**Interface Definition:**
```typescript
interface IdentityPort {
  /**
   * Verify JWT token and extract claims
   * @throws InvalidTokenError if token is invalid or expired
   */
  verifyToken(token: string): Promise<TokenClaims>;
  
  /**
   * Resolve user context from token claims
   * @throws UserNotFoundError if user doesn't exist
   */
  getUserContext(claims: TokenClaims): Promise<UserContext>;
  
  /**
   * Refresh access token using refresh token
   */
  refreshToken(refreshToken: string): Promise<TokenPair>;
  
  /**
   * Revoke token (logout)
   */
  revokeToken(token: string): Promise<void>;
}
```

**Concrete Implementations:**
- `OIDCAdapter` — OpenID Connect (Keycloak, Auth0, Okta, Azure AD)
- `DevAuthAdapter` — Local JWT generation for development (NEVER in production)
- `CognitoAdapter` — AWS Cognito (future)

**Implementation Suggestion:**
- Add `getUserPermissions()` method for ABAC policy evaluation
- Implement token caching with Redis to reduce IdP calls
- Add support for API key authentication for service-to-service communication

### 5.3 AuditPort (Audit Trail)

**Interface Definition:**
```typescript
interface AuditPort {
  /**
   * Write audit event to immutable log
   * @throws AuditError if write fails (MUST NOT fail silently)
   */
  writeAuditEvent(event: AuditEvent): Promise<void>;
  
  /**
   * Query audit events with filters
   */
  queryAuditEvents(query: AuditQuery): Promise<PaginatedAuditEvents>;
  
  /**
   * Generate audit report for compliance
   */
  generateAuditReport(params: AuditReportParams): Promise<AuditReport>;
}
```

**Concrete Implementations:**
- `PostgresAuditAdapter` — Append-only table with partitioning
- `EventStoreAuditAdapter` — Dedicated event store (future)
- `CloudWatchAuditAdapter` — AWS CloudWatch Logs (future)

**Implementation Suggestion:**
- Implement event sourcing pattern for critical operations
- Add cryptographic signatures to audit events for tamper detection
- Implement automatic archival to cold storage after retention period

### 5.4 NotificationPort (Multi-Channel Notifications)

**Interface Definition:**
```typescript
interface NotificationPort {
  /**
   * Send email notification with template rendering
   */
  sendEmail(params: EmailParams): Promise<NotificationResult>;
  
  /**
   * Send SMS notification
   */
  sendSMS(params: SMSParams): Promise<NotificationResult>;
  
  /**
   * Send push notification to mobile devices
   */
  sendPushNotification(params: PushParams): Promise<NotificationResult>;
  
  /**
   * Send webhook notification
   */
  sendWebhook(params: WebhookParams): Promise<NotificationResult>;
}
```

**Concrete Implementations:**
- `ConsoleNotificationAdapter` — Development logging
- `SESAdapter` — AWS Simple Email Service
- `SendGridAdapter` — SendGrid email service
- `TwilioAdapter` — Twilio SMS
- `FCMAdapter` — Firebase Cloud Messaging for push notifications

**Implementation Suggestion:**
- Implement notification templates with variable substitution
- Add retry logic with dead-letter queue for failed notifications
- Implement notification preferences per user (opt-out management)

### 5.5 ClockPort (Time Abstraction)

**Interface Definition:**
```typescript
interface ClockPort {
  /**
   * Get current timestamp
   * @returns ISO 8601 timestamp in UTC
   */
  now(): Date;
  
  /**
   * Get current Unix timestamp in milliseconds
   */
  nowMillis(): number;
  
  /**
   * Get current Unix timestamp in seconds
   */
  nowSeconds(): number;
}
```

**Concrete Implementations:**
- `SystemClockAdapter` — Production implementation using `Date.now()`
- `FixedClockAdapter` — Testing implementation with frozen time
- `OffsetClockAdapter` — Testing implementation with time travel

**Rationale:** Enables deterministic testing of time-dependent logic (expiration calculations, temporal windows) without brittle date mocking.

**Implementation Suggestion:**
- Add `sleep(ms)` method for controlled delays in tests
- Add timezone conversion utilities for multi-region deployments

---

## 6. Cross-Cutting Invariants (Non-Negotiable Rules)

### 6.1 Multi-Tenancy Enforcement

**Data Isolation Requirements:**
- **Database Level:** Every persisted entity MUST include `tenant_id` column (NOT NULL, indexed)
- **Query Level:** All database queries MUST filter by `tenant_id` (enforced via repository base class)
- **Authorization Level:** Never trust client-provided IDs; always validate resource ownership against authenticated tenant

**Implementation Patterns:**
```typescript
// ❌ PROHIBITED - Missing tenant filter
const document = await db.documents.findUnique({ where: { id: documentId } });

// ✅ REQUIRED - Tenant-aware query
const document = await db.documents.findUnique({ 
  where: { 
    id: documentId,
    tenant_id: userContext.tenantId 
  } 
});
```

**Implementation Suggestion:**
- Use database-level Row-Level Security (RLS) policies as defense-in-depth
- Implement tenant context middleware that injects `tenant_id` into all requests
- Add database migration linter to reject tables without `tenant_id`

### 6.2 Document State Machine

**Canonical States:**
```typescript
enum DocumentStatus {
  PENDING = 'PENDING',           // Uploaded, awaiting review
  IN_REVIEW = 'IN_REVIEW',       // Under review by approver
  APPROVED = 'APPROVED',         // Accepted and valid
  REJECTED = 'REJECTED',         // Rejected with reason codes
  EXPIRED = 'EXPIRED',           // Past expiration date
  REVOKED = 'REVOKED'            // Manually revoked
}
```

**State Transition Rules:**
```
PENDING → IN_REVIEW → APPROVED
                   ↘ REJECTED
APPROVED → EXPIRED
APPROVED → REVOKED
```

**Folder Status Calculation:**
Folder status MUST be derived (computed property), never stored:
```typescript
function calculateFolderStatus(documents: Document[]): FolderStatus {
  if (documents.some(d => d.status === 'REJECTED')) return 'INCOMPLETE';
  if (documents.some(d => d.status === 'EXPIRED')) return 'INCOMPLETE';
  if (documents.some(d => d.status === 'PENDING')) return 'INCOMPLETE';
  if (documents.some(d => d.status === 'IN_REVIEW')) return 'IN_REVIEW';
  if (documents.every(d => d.status === 'APPROVED')) return 'COMPLETE';
  return 'INCOMPLETE';
}
```

**Implementation Suggestion:**
- Implement state machine pattern with explicit transition guards
- Store state transition history in audit log
- Add database constraint to prevent invalid state transitions

### 6.3 Expiration Management

**Notification Thresholds (Configurable):**
- **T-30 days:** First warning notification
- **T-15 days:** Second warning notification
- **T-7 days:** Final warning notification
- **T-0 days:** Automatic status change to EXPIRED

**Revocation Policy:**
When a critical document expires:
1. Document status transitions to `EXPIRED`
2. Associated accreditation is automatically revoked
3. Access permissions are immediately invalidated
4. Policy evaluator returns `DENY` with reason code `DOC_EXPIRED`
5. Notification sent to document owner and administrators

**Implementation Suggestion:**
- Use scheduled job (cron or queue-based) to check expirations every 6 hours
- Implement grace period configuration for non-critical documents
- Add webhook notifications for external system integration

### 6.4 Standardized Reason Codes

**Requirement:** All denial and rejection decisions MUST return structured reason codes. Free-form text strings are prohibited.

**Reason Code Taxonomy:**

**Document-Related:**
- `DOC_EXPIRED` — Document past expiration date
- `DOC_MISSING` — Required document not uploaded
- `DOC_REJECTED` — Document rejected during review
- `DOC_INVALID_FORMAT` — Unsupported file format
- `DOC_UNREADABLE` — Document corrupted or unreadable

**Accreditation-Related:**
- `NOT_ACCREDITED` — Person/vehicle not accredited
- `NOT_HABILITATED` — Person not authorized for specific site/area
- `ACCREDITATION_EXPIRED` — Accreditation period ended
- `ACCREDITATION_SUSPENDED` — Accreditation temporarily suspended
- `ACCREDITATION_REVOKED` — Accreditation permanently revoked

**Authentication-Related:**
- `QR_SIGNATURE_INVALID` — Cryptographic signature verification failed
- `QR_EXPIRED` — QR token past expiration timestamp
- `QR_REPLAY_DETECTED` — QR token used multiple times (replay attack)
- `SUBJECT_NOT_FOUND` — QR subject does not exist in system
- `TOKEN_INVALID` — JWT token invalid or malformed
- `TOKEN_EXPIRED` — JWT token past expiration

**Access Control:**
- `OUTSIDE_TIME_WINDOW` — Access attempted outside permitted hours
- `SITE_MISMATCH` — Access attempted at unauthorized site
- `BLACKLISTED` — Subject on access blacklist
- `CAPACITY_EXCEEDED` — Site at maximum capacity

**Cafeteria:**
- `ALREADY_CONSUMED_MEAL` — Meal already consumed today
- `NO_MEAL_ENTITLEMENT` — No meal entitlement for this period
- `OUTSIDE_MEAL_WINDOW` — Outside meal service hours
- `MEAL_TYPE_MISMATCH` — Wrong meal type for time window

**Implementation Suggestion:**
- Define reason codes as TypeScript enum or constants
- Include localization keys for user-facing messages
- Add telemetry to track most common denial reasons for analytics

### 6.5 Mandatory Audit Trail

**Auditable Operations:**
- Document lifecycle events (upload, review, approval, rejection, expiration)
- QR token generation and validation
- Access control decisions (both ALLOW and DENY)
- Vehicle access events
- Cafeteria consumption events
- Configuration changes (requirement definitions, policies)
- User and role management operations

**Audit Event Structure:**
```typescript
interface AuditEvent {
  id: string;                    // Unique event ID (UUID)
  timestamp: string;             // ISO 8601 UTC timestamp
  tenant_id: string;             // Tenant identifier
  actor: ActorContext;           // Who performed the action
  action: string;                // What action was performed
  resource_type: string;         // Type of resource affected
  resource_id: string;           // ID of resource affected
  outcome: 'SUCCESS' | 'FAILURE';
  reason_codes?: string[];       // Reason codes if applicable
  metadata: Record<string, any>; // Additional context
  correlation_id: string;        // Request correlation ID
  ip_address?: string;           // Source IP address
  user_agent?: string;           // Client user agent
}
```

**Implementation Suggestion:**
- Implement audit logging as middleware/decorator for automatic capture
- Use append-only storage with write-ahead logging
- Implement audit log integrity verification (hash chains or Merkle trees)
- Add GDPR-compliant PII redaction for sensitive fields

---

## 7. Policy Evaluator (Authorization Engine)

**Architectural Role:** Deterministic, stateless decision engine for runtime authorization.

**Evaluation Domains:**
- Physical access control (personnel)
- Vehicle access control
- Cafeteria meal entitlement

**Evaluation Contract:**

**Input:**
```typescript
interface EvaluationContext {
  tenant_id: string;
  site_id?: string;
  subject: Subject;              // Person or vehicle being evaluated
  action: string;                // 'ACCESS', 'CONSUME_MEAL', etc.
  resource?: Resource;           // Optional resource being accessed
  timestamp: Date;               // Evaluation timestamp
  additional_facts: Record<string, any>;
}
```

**Output:**
```typescript
interface EvaluationResult {
  decision: 'ALLOW' | 'DENY';
  reason_codes: string[];        // Empty array = ALLOW, populated = DENY
  evaluated_at: Date;
  snapshot: EvaluationSnapshot;  // Immutable snapshot of evaluation state
  metadata?: Record<string, any>;
}
```

**Decision Logic:**
```typescript
function evaluate(context: EvaluationContext): EvaluationResult {
  const reasons: string[] = [];
  
  // Accumulate all denial reasons
  if (!subject.isAccredited) reasons.push('NOT_ACCREDITED');
  if (subject.hasExpiredDocuments) reasons.push('DOC_EXPIRED');
  if (!isWithinTimeWindow(context.timestamp)) reasons.push('OUTSIDE_TIME_WINDOW');
  // ... additional checks
  
  // Decision is binary based on reason accumulation
  const decision = reasons.length === 0 ? 'ALLOW' : 'DENY';
  
  // ALWAYS log event regardless of decision
  auditPort.writeAuditEvent({
    action: context.action,
    decision,
    reason_codes: reasons,
    // ... additional fields
  });
  
  return { decision, reason_codes: reasons, /* ... */ };
}
```

**Critical Requirements:**
1. **Determinism:** Same input MUST always produce same output
2. **Testability:** Pure function with no side effects (except audit logging)
3. **Completeness:** All denial reasons MUST be captured, not just first failure
4. **Auditability:** Every evaluation MUST generate audit event
5. **Performance:** Evaluation MUST complete in <100ms for real-time access control

**Implementation Suggestion:**
- Implement as pure function with dependency injection for ports
- Use rule engine pattern (e.g., json-rules-engine) for complex policies
- Add policy versioning to track changes over time
- Implement policy simulation mode for testing without side effects
- Add performance monitoring and alerting for slow evaluations

---

## 8. API Conventions (RESTful + OpenAPI)

### 8.1 Contract-First Development

**Source of Truth:** `/openapi/api.v1.yaml` is the authoritative API contract.

**Development Workflow:**
1. Define or modify OpenAPI specification
2. Generate TypeScript types from OpenAPI spec
3. Implement controllers conforming to generated types
4. Validate implementation against spec using contract tests

**Pull Request Requirements:**
- API changes MUST include corresponding OpenAPI spec updates in same PR
- Breaking changes MUST increment API version
- Spec changes MUST be validated with OpenAPI linter (Spectral)

**Implementation Suggestion:**
- Use `openapi-typescript` for type generation
- Use `@openapitools/openapi-generator-cli` for client SDK generation
- Implement CI check to validate spec against implementation

### 8.2 Response and Error Formatting

**Success Response (2xx):**
```json
{
  "data": { /* resource or collection */ },
  "meta": {
    "request_id": "req_abc123",
    "timestamp": "2025-12-27T05:07:00Z"
  }
}
```

**Error Response (4xx, 5xx):**
```json
{
  "error": {
    "code": "DOC_EXPIRED",
    "message": "Document has expired and must be renewed",
    "details": {
      "document_id": "doc_123",
      "expired_at": "2025-12-01T00:00:00Z"
    },
    "request_id": "req_abc123",
    "timestamp": "2025-12-27T05:07:00Z"
  }
}
```

**HTTP Status Code Guidelines:**
- `200 OK` — Successful GET, PUT, PATCH
- `201 Created` — Successful POST creating resource
- `204 No Content` — Successful DELETE
- `400 Bad Request` — Validation error
- `401 Unauthorized` — Missing or invalid authentication
- `403 Forbidden` — Authenticated but insufficient permissions
- `404 Not Found` — Resource does not exist
- `409 Conflict` — Resource conflict (e.g., duplicate)
- `422 Unprocessable Entity` — Semantic validation error
- `429 Too Many Requests` — Rate limit exceeded
- `500 Internal Server Error` — Unexpected server error
- `503 Service Unavailable` — Temporary service outage

**Correlation ID:**
- Include `X-Correlation-ID` header in all responses
- Log correlation ID with all log statements for request tracing
- Propagate correlation ID to downstream services

**Implementation Suggestion:**
- Implement global error handler middleware
- Use problem details format (RFC 7807) for error responses
- Add request/response logging middleware with correlation ID

### 8.3 Pagination

**Requirement:** All collection endpoints MUST implement pagination.

**Pagination Strategy (Choose One Consistently):**

**Option A: Offset-Based Pagination**
```
GET /api/v1/documents?page=2&page_size=50
```
Response:
```json
{
  "data": [ /* items */ ],
  "meta": {
    "page": 2,
    "page_size": 50,
    "total_items": 1234,
    "total_pages": 25
  }
}
```

**Option B: Cursor-Based Pagination (Recommended for large datasets)**
```
GET /api/v1/documents?cursor=eyJpZCI6MTIzfQ&limit=50
```
Response:
```json
{
  "data": [ /* items */ ],
  "meta": {
    "next_cursor": "eyJpZCI6MTczfQ",
    "has_more": true
  }
}
```

**Implementation Suggestion:**
- Use cursor-based pagination for real-time data (access logs, audit events)
- Use offset-based pagination for static data (document lists)
- Implement maximum page size limit (e.g., 100 items)
- Add `Link` header with `next`, `prev`, `first`, `last` URLs (RFC 5988)

### 8.4 API Versioning

**Versioning Strategy:** URL path versioning

**Format:** `/api/v{major}/resource`

**Examples:**
- `/api/v1/documents`
- `/api/v2/documents`

**Version Increment Policy:**
- **Major version:** Breaking changes (field removal, type changes, behavior changes)
- **Minor version:** Additive changes (new fields, new endpoints) — no version increment needed
- **Patch version:** Bug fixes — no version increment needed

**Deprecation Policy:**
1. Announce deprecation with 6-month notice
2. Add `Deprecation` and `Sunset` headers to deprecated endpoints
3. Maintain deprecated version for minimum 12 months
4. Provide migration guide in documentation

**Implementation Suggestion:**
- Use API gateway for version routing
- Implement version negotiation via `Accept` header as alternative
- Add automated tests for backward compatibility

---

## 9. Database Conventions (PostgreSQL)

### 9.1 Naming Conventions

**Tables:** `snake_case`, plural nouns
- ✅ `documents`, `access_events`, `vehicle_accreditations`
- ❌ `Document`, `accessEvent`, `VehicleAccreditation`

**Columns:** `snake_case`
- ✅ `tenant_id`, `created_at`, `expiration_date`
- ❌ `tenantId`, `CreatedAt`, `expirationDate`

**Indexes:** `idx_{table}_{columns}`
- ✅ `idx_documents_tenant_id_status`
- ❌ `documents_index_1`

**Foreign Keys:** `fk_{table}_{referenced_table}`
- ✅ `fk_documents_document_folders`
- ❌ `documents_folders_fk`

### 9.2 Standard Columns

**Every table MUST include:**
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
tenant_id UUID NOT NULL REFERENCES tenants(id),
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
```

**Indexes:**
```sql
CREATE INDEX idx_{table}_tenant_id ON {table}(tenant_id);
CREATE INDEX idx_{table}_created_at ON {table}(created_at);
```

**Soft Deletes (Optional):**
```sql
deleted_at TIMESTAMPTZ NULL,
```

### 9.3 Migration Management

**Tool Selection:** Prisma Migrate, Alembic, Flyway, or Liquibase (choose one)

**Migration Naming:** `{timestamp}_{description}`
- ✅ `20251227050700_add_vehicle_accreditations_table.sql`
- ❌ `migration_1.sql`, `update.sql`

**Migration Rules:**
1. **Never edit committed migrations** — create new migration to fix issues
2. **Always test migrations on copy of production data** before deploying
3. **Include both up and down migrations** for rollback capability
4. **Use transactions** for atomic migration execution
5. **Avoid data migrations in schema migrations** — separate data backfill scripts

**Implementation Suggestion:**
- Implement migration linting to enforce naming conventions
- Add migration testing in CI pipeline
- Implement automatic rollback on migration failure
- Use blue-green deployment for zero-downtime migrations

### 9.4 Performance Optimization

**Indexing Strategy:**
- Index all foreign keys
- Index columns used in WHERE clauses frequently
- Use partial indexes for filtered queries
- Use composite indexes for multi-column queries

**Query Optimization:**
- Use `EXPLAIN ANALYZE` for slow queries
- Implement connection pooling (PgBouncer)
- Use read replicas for reporting queries
- Implement query result caching for expensive queries

**Implementation Suggestion:**
- Add slow query logging (>100ms)
- Implement query performance monitoring
- Use database query analyzer tools (pg_stat_statements)

---

## 10. Document Storage and Security

### 10.1 Storage Architecture

**Principle:** All documents MUST reside in private object storage with access mediated by backend.

**Storage Provider:** S3-compatible object storage (AWS S3, Railway Buckets, MinIO, Cloudflare R2)

**Bucket Structure:**
```
{tenant_id}/
  documents/
    {document_id}/
      {version_id}/
        original.{ext}
        thumbnail.jpg
        metadata.json
  exports/
    {export_id}.{format}
  temp/
    {upload_id}/
```

### 10.2 Access Control

**Upload Flow:**
1. Client requests presigned upload URL from backend
2. Backend validates user permissions and generates presigned URL (15-minute TTL)
3. Client uploads directly to storage using presigned URL
4. Client notifies backend of upload completion
5. Backend validates upload and creates document record

**Download Flow:**
1. Client requests document download from backend
2. Backend validates user permissions and document ownership
3. Backend generates presigned download URL (1-hour TTL)
4. Client downloads directly from storage using presigned URL

**Security Requirements:**
- Storage bucket MUST NOT allow public read access
- Presigned URLs MUST have short TTL (upload: 15 min, download: 1 hour)
- Backend MUST validate tenant ownership before generating presigned URLs
- Document access MUST be logged in audit trail

**Implementation Suggestion:**
- Implement virus scanning on upload (ClamAV, AWS Macie)
- Add document encryption at rest (S3 SSE-KMS)
- Implement document versioning for audit trail
- Add content-type validation to prevent malicious uploads

### 10.3 Document Lifecycle

**States:**
1. **Uploading:** Presigned URL generated, upload in progress
2. **Processing:** Upload complete, virus scanning, thumbnail generation
3. **Available:** Document ready for access
4. **Archived:** Document moved to cold storage after retention period
5. **Deleted:** Document marked for deletion (soft delete)
6. **Purged:** Document permanently deleted after grace period

**Implementation Suggestion:**
- Implement lifecycle policies for automatic archival
- Add document retention policies per regulatory requirements
- Implement legal hold capability for litigation

---

## 11. QR Code Authentication

### 11.1 Dual Authentication Modes

**Mode 1: Standard QR (CARNET_QR)**
- **Use Case:** Identity resolution from external ID cards
- **Trust Level:** Low (requires online validation)
- **Format:** URL or JSON with external ID reference
- **Validation:** Backend resolves external ID to internal subject, validates accreditation

**Mode 2: Signed QR (SIGNED_QR)**
- **Use Case:** System-issued access tokens
- **Trust Level:** High (cryptographically signed)
- **Format:** JWT with asymmetric signature (RS256 or ES256)
- **Validation:** Offline-capable with public key verification

### 11.2 Signed QR Specification

**JWT Claims:**
```json
{
  "iss": "https://eaa.example.com",
  "sub": "person:123e4567-e89b-12d3-a456-426614174000",
  "aud": "access-control",
  "exp": 1735275420,
  "iat": 1735271820,
  "nbf": 1735271820,
  "jti": "qr_abc123",
  "tenant_id": "tenant_xyz",
  "site_id": "site_001",
  "purpose": "ACCESS",
  "kid": "key_2025_01"
}
```

**Validation Requirements:**
1. **Signature Verification:** Validate JWT signature using public key identified by `kid`
2. **Expiration Check:** Verify `exp` claim is in future
3. **Not Before Check:** Verify `nbf` claim is in past
4. **Tenant Validation:** Verify `tenant_id` matches expected tenant
5. **Site Validation (Optional):** Verify `site_id` matches access point location
6. **Replay Prevention:** Check `jti` (JWT ID) against used token cache

**TTL Configuration:**
- **Short-lived tokens:** 1-4 hours (default: 1 hour)
- **Long-lived tokens:** 24 hours (for special cases with approval)

### 11.3 Key Management

**Key Rotation Strategy:**
1. Generate new key pair with unique `kid`
2. Add new public key to active key set
3. Begin signing new tokens with new private key
4. Maintain old public keys for validation during rotation period
5. Remove old public keys after all tokens signed with old key have expired

**Key Storage:**
- **Private Keys:** Encrypted at rest in secrets manager (AWS Secrets Manager, HashiCorp Vault)
- **Public Keys:** Exposed via JWKS endpoint (`/.well-known/jwks.json`)

**Rotation Schedule:** Every 90 days or on compromise

**Implementation Suggestion:**
- Use elliptic curve keys (ES256) for smaller QR codes
- Implement automatic key rotation with zero downtime
- Add key compromise revocation mechanism
- Implement hardware security module (HSM) for private key storage in production

---

## 12. Code Conventions

### 12.1 Language and Naming

**Code Language:** English
- Classes, methods, variables, comments MUST be in English
- ✅ `class DocumentService`, `function calculateExpiration()`
- ❌ `class ServicioDocumento`, `function calcularVencimiento()`

**Documentation Language:** Spanish (preferred for business documentation)
- Architecture documents, user guides, API documentation MAY be in Spanish
- Technical comments in code SHOULD be in English

**Module Names:**
- `core` — Core domain and shared kernel
- `documental` — Document management (Spanish term retained for business alignment)
- `access` — Physical access control
- `vehicle` — Vehicle management
- `casino` — Cafeteria/dining (Spanish term retained for business alignment)
- `reporting` — Analytics and reporting

### 12.2 Code Formatting and Linting

**Enforcement:**
- Pull requests MUST NOT be merged if linting or tests fail
- Use standard formatter (Prettier for TypeScript/JavaScript, Black/Ruff for Python)
- Configure pre-commit hooks to run formatter and linter

**Configuration:**
```json
// .prettierrc (TypeScript/JavaScript)
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
```

**Implementation Suggestion:**
- Add `.editorconfig` for cross-IDE consistency
- Configure CI to fail on formatting violations
- Use `husky` for pre-commit hooks

### 12.3 Change Management Principles

**Pull Request Guidelines:**
- **Small, Focused PRs:** Each PR should address a single concern
- **Clear Intent:** PR title and description must clearly state purpose
- **No Mass Refactoring:** Large-scale refactoring requires ADR and team approval
- **Composition Over Coupling:** Prefer loosely coupled, composable components

**Code Review Requirements:**
- At least one approval from code owner
- All CI checks must pass
- No unresolved comments
- Documentation updated if applicable

**Implementation Suggestion:**
- Use conventional commits (feat:, fix:, docs:, refactor:, test:)
- Implement PR templates with checklist
- Add CODEOWNERS file for automatic reviewer assignment

---

## 13. Testing Strategy

### 13.1 Test Coverage Requirements

**Minimum Requirements per Pull Request:**

**Unit Tests (Required):**
- **Policy Evaluator:** All decision paths and reason code combinations
- **State Calculations:** Document and folder status derivation logic
- **Expiration Logic:** Notification threshold calculations and revocation triggers
- **Domain Services:** All business rule implementations
- **Value Objects:** Validation and transformation logic

**Integration Tests (Required):**
- **Database Repositories:** CRUD operations with tenant filtering (smoke tests)
- **Storage Adapters:** Presigned URL generation and validation
- **Identity Adapters:** Token verification and user context resolution
- **Notification Adapters:** Template rendering and delivery (with mocks)

**Contract Tests (When Frontend Exists):**
- **OpenAPI Validation:** Request/response conformance to specification
- **Schema Validation:** DTO serialization/deserialization

**End-to-End Tests (Critical Paths):**
- Document upload and approval workflow
- Access control evaluation and event logging
- QR token generation and validation

### 13.2 Testing Principles

**Test Isolation:**
- Tests MUST NOT depend on external services (use test doubles)
- Use in-memory database for repository tests (or containerized PostgreSQL)
- Mock time-dependent logic using `ClockPort`

**Test Data Management:**
- Use factories/builders for test data generation
- Implement database seeding for integration tests
- Clean up test data after each test run

**Implementation Suggestion:**
- Use Jest (TypeScript) or pytest (Python) as test framework
- Implement test coverage threshold (minimum 80% for domain/application layers)
- Add mutation testing to verify test quality
- Use Testcontainers for integration tests requiring real databases

---

## 14. CI/CD Pipeline

### 14.1 Pull Request Pipeline

**Required Checks (All Must Pass):**
1. **Linting:** Code style and formatting validation
2. **Type Checking:** TypeScript/Python type validation
3. **Unit Tests:** All unit tests must pass
4. **Integration Tests:** All integration tests must pass
5. **Build:** Application must compile/build successfully
6. **Security Scan:** Dependency vulnerability scanning
7. **OpenAPI Validation:** Spec linting and validation

**Pipeline Configuration:**
```yaml
# .github/workflows/pr.yml
name: Pull Request
on: [pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install dependencies
        run: npm ci
      - name: Lint
        run: npm run lint
      - name: Type check
        run: npm run type-check
      - name: Unit tests
        run: npm run test:unit
      - name: Integration tests
        run: npm run test:integration
      - name: Build
        run: npm run build
      - name: Security scan
        run: npm audit --audit-level=high
```

### 14.2 Main Branch Pipeline

**Deployment Workflow:**
1. **Build:** Create production-ready artifact
2. **Deploy to Staging:** Automatic deployment to staging environment
3. **Smoke Tests:** Critical path validation in staging
4. **Manual Approval:** Required for production deployment
5. **Deploy to Production:** Blue-green deployment with rollback capability
6. **Post-Deployment Verification:** Health checks and monitoring

**Smoke Test Requirements:**
- Health endpoint responds with 200 OK
- Database connectivity verified
- Storage service accessible
- Identity provider reachable
- Cache/queue services operational (when implemented)

**Implementation Suggestion:**
- Use GitHub Actions, GitLab CI, or CircleCI
- Implement deployment notifications (Slack, email)
- Add automatic rollback on failed smoke tests
- Implement canary deployments for gradual rollout

---

## 15. Living Documentation

### 15.1 Documentation Maintenance Policy

**Architecture Decision Records (ADRs):**
- **Trigger:** Any significant architectural change or technology choice
- **Location:** `/docs/adrs/`
- **Format:** Markdown following ADR template
- **Review:** Required approval from technical lead

**ADR Template Structure:**
```markdown
# ADR-XXXX: [Title]

## Status
[Proposed | Accepted | Deprecated | Superseded]

## Context
[Problem statement and constraints]

## Decision
[Chosen solution and rationale]

## Consequences
[Positive and negative impacts]

## Alternatives Considered
[Other options and why they were rejected]
```

**API Documentation:**
- **Trigger:** Any endpoint or schema change
- **Action:** Update `/openapi/api.v1.yaml` in same PR
- **Validation:** OpenAPI linter must pass

**Policy Documentation:**
- **Trigger:** New reason codes, policy rules, or evaluation logic changes
- **Action:** Update policy specification document
- **Validation:** Add corresponding unit tests

### 15.2 Documentation Types

**Technical Documentation:**
- Architecture diagrams (C4 model, ERD)
- API specifications (OpenAPI)
- Deployment guides
- Runbooks for operations

**Business Documentation:**
- Requirements specifications (SRS)
- Non-functional requirements (NFR)
- User guides
- Compliance documentation

**Implementation Suggestion:**
- Use docs-as-code approach (Markdown in repository)
- Implement documentation linting (markdownlint)
- Generate API documentation from OpenAPI spec
- Use Mermaid for diagrams in Markdown

---

## 16. IDE Agent Guidelines

### 16.1 Mandatory Practices (DO)

**Architectural Compliance:**
- Respect hexagonal architecture: domain layer MUST NOT import infrastructure
- Add new dependencies only in `infra/` layer with justification
- Maintain `tenant_id` filtering in all database queries
- Use standardized `reason_codes` (never free-form strings)
- Update OpenAPI specification when modifying endpoints
- Write tests for all new business rules
- Keep pull request diffs small and focused
- Follow established naming conventions
- Add audit logging for sensitive operations
- Validate input at API boundary

**Code Quality:**
- Use TypeScript strict mode (or Python type hints)
- Handle errors explicitly (no silent failures)
- Add JSDoc/docstrings for public APIs
- Use dependency injection for testability

### 16.2 Prohibited Practices (DON'T)

**Architectural Violations:**
- NEVER import AWS SDK, Prisma, or ORMs in `domain/` layer
- NEVER access database directly from controllers (bypass use cases)
- NEVER hardcode URLs, credentials, or secrets (use environment variables)
- NEVER create authentication bypasses (use `DevAuthAdapter` with feature flag)
- NEVER violate naming conventions or canonical states
- NEVER commit `.env` files or secrets to repository
- NEVER skip tenant validation in queries
- NEVER use `any` type in TypeScript (use proper types)

**Code Quality Violations:**
- NEVER merge code with failing tests or linting errors
- NEVER leave commented-out code in commits
- NEVER use magic numbers (define constants)
- NEVER ignore TypeScript/linter warnings

---

## 17. Environment Configuration

### 17.1 Configuration Management

**Principle:** All environment-specific configuration MUST be externalized via environment variables.

**Configuration File:** `.env` (NEVER committed to version control)

**Required Environment Variables:**

**Database:**
```bash
DB_URL=postgresql://user:password@host:5432/database
DB_POOL_MIN=2
DB_POOL_MAX=10
```

**Object Storage:**
```bash
STORAGE_ENDPOINT=https://s3.amazonaws.com
STORAGE_BUCKET=eaa-documents
STORAGE_ACCESS_KEY=AKIA...
STORAGE_SECRET_KEY=...
STORAGE_REGION=us-east-1
```

**Identity Provider:**
```bash
OIDC_ISSUER=https://keycloak.example.com/realms/eaa
OIDC_CLIENT_ID=eaa-backend
OIDC_AUDIENCE=eaa-api
OIDC_JWKS_URI=https://keycloak.example.com/realms/eaa/protocol/openid-connect/certs
```

**Cryptographic Keys:**
```bash
SIGNING_KEY_ID=key_2025_01
SIGNING_PRIVATE_KEY_PATH=/secrets/signing-key.pem
SIGNING_PUBLIC_KEY_PATH=/secrets/signing-key.pub
```

**Application:**
```bash
APP_ENV=development  # development | staging | production
APP_PORT=3000
APP_LOG_LEVEL=info   # debug | info | warn | error
CORS_ORIGINS=http://localhost:5173,https://app.example.com
```

### 17.2 Configuration Validation

**Startup Validation:**
Application MUST validate all required environment variables at startup and fail fast if missing.

**Implementation Example:**
```typescript
function validateConfig(): Config {
  const required = ['DB_URL', 'STORAGE_ENDPOINT', 'OIDC_ISSUER'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  return {
    database: { url: process.env.DB_URL! },
    storage: { endpoint: process.env.STORAGE_ENDPOINT! },
    // ...
  };
}
```

**Implementation Suggestion:**
- Use `dotenv` for local development
- Use secrets manager for production (AWS Secrets Manager, HashiCorp Vault)
- Implement configuration schema validation (Zod, Joi)
- Never log sensitive configuration values

---

## 18. Major Change Approval Process

### 18.1 Changes Requiring ADR and Approval

**Architectural Changes:**
- Framework migration (NestJS ↔ Fastify ↔ Hono ↔ FastAPI)
- Database technology change (PostgreSQL ↔ MySQL ↔ MongoDB)
- Authentication strategy change (Keycloak ↔ Auth0 ↔ Cognito)
- Deployment model change (monolith ↔ microservices)
- Message queue introduction or replacement (cron ↔ SQS ↔ RabbitMQ)

**Infrastructure Changes:**
- Cloud provider migration (Railway ↔ AWS ↔ Azure ↔ GCP)
- Storage provider change (S3 ↔ Azure Blob ↔ GCS)
- Cache introduction or replacement (Redis ↔ Memcached)

### 18.2 Approval Workflow

**Process:**
1. **Proposal:** Author creates ADR with problem statement and proposed solution
2. **Alternatives Analysis:** Document at least 2 alternative approaches with trade-offs
3. **Impact Assessment:** Analyze impact on existing contracts, data, and operations
4. **Migration Plan:** Define step-by-step migration strategy with rollback plan
5. **Team Review:** Present to technical team for feedback
6. **Approval:** Obtain approval from technical lead and stakeholders
7. **Implementation:** Execute migration plan with monitoring
8. **Retrospective:** Document lessons learned and update ADR

**ADR Approval Criteria:**
- Clear problem statement and context
- Comprehensive alternatives analysis
- Detailed migration plan with timeline
- Risk assessment and mitigation strategies
- Backward compatibility or deprecation plan

---

## 19. Technology Stack Decision

### 19.1 Current Stack (Baseline)

**Backend:**
- **Runtime:** Node.js 20+ LTS
- **Language:** TypeScript 5+
- **Framework:** Hono (lightweight, edge-ready) or NestJS (enterprise, modular)
- **Recommendation:** Hono for simplicity and performance; NestJS for large teams and complex domains

**Database:**
- **Primary:** PostgreSQL 15+
- **ORM/Query Builder:** Prisma (type-safe) or Drizzle (lightweight)
- **Migrations:** Prisma Migrate or custom SQL migrations

**Object Storage:**
- **Development/Staging:** Railway Buckets (S3-compatible)
- **Production:** AWS S3 or Cloudflare R2
- **SDK:** AWS SDK v3 for JavaScript

**Identity Provider:**
- **Development:** DevAuth adapter (local JWT)
- **Staging/Production:** Keycloak (self-hosted) or Auth0 (managed)

**Caching (Planned):**
- **Provider:** Railway Redis or Upstash
- **Client:** ioredis

**Message Queue (Planned):**
- **Provider:** Railway RabbitMQ or AWS SQS
- **Client:** amqplib or AWS SDK

### 19.2 Alternative Stack Considerations

**Python Alternative:**
- **Runtime:** Python 3.11+
- **Framework:** FastAPI (async, OpenAPI native)
- **ORM:** SQLAlchemy 2.0 with async support
- **Migration Tool:** Alembic

**Decision Criteria:**
- Team expertise and hiring market
- Ecosystem maturity and library availability
- Performance requirements
- Type safety and developer experience

**Change Process:**
If stack decision changes, MUST:
1. Create ADR documenting rationale
2. Update this document with new baseline
3. Update all related documentation
4. Plan migration strategy if applicable

---

## Appendix: Implementation Priorities

### Phase 1: Foundation (Weeks 1-4)
- [ ] Project structure and module boundaries
- [ ] Database schema and migrations
- [ ] Port interfaces definition
- [ ] Core domain entities and value objects
- [ ] Multi-tenancy enforcement
- [ ] Basic CRUD operations

### Phase 2: Authentication & Authorization (Weeks 5-6)
- [ ] Identity provider integration
- [ ] Policy evaluator implementation
- [ ] Reason code taxonomy
- [ ] Audit logging infrastructure

### Phase 3: Document Management (Weeks 7-10)
- [ ] Storage adapter implementation
- [ ] Document upload/download workflows
- [ ] Document state machine
- [ ] Expiration notification engine
- [ ] Certificate generation

### Phase 4: Access Control (Weeks 11-14)
- [ ] QR code generation and validation
- [ ] Access event logging
- [ ] Real-time policy evaluation
- [ ] Biometric integration preparation

### Phase 5: Additional Modules (Weeks 15-18)
- [ ] Vehicle control module
- [ ] Cafeteria module
- [ ] Reporting and analytics

### Phase 6: Production Readiness (Weeks 19-20)
- [ ] Performance optimization
- [ ] Security hardening
- [ ] Monitoring and alerting
- [ ] Documentation completion
- [ ] Production deployment

---

**Document Version:** 1.0.0  
**Last Updated:** 2025-12-27  
**Next Review:** 2026-03-27
