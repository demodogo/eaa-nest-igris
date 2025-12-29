# DEVELOPMENT_INFRA.md — Especificación de Infraestructura de Desarrollo

**Entorno:** Desarrollo (Remote-First, sin Docker)  
**Última Actualización:** 2025-12-27  
**Estado:** Activo (Baseline)  
**Clasificación:** Documentación Técnica Interna

---

## Propósito y Alcance del Documento

Este documento establece la arquitectura de infraestructura de desarrollo, topología de servicios y procedimientos operacionales para el entorno de desarrollo remote-first. Sirve como referencia autoritativa para:

- **Aprovisionamiento de Infraestructura:** Especificación completa de servicios alojados en Railway
- **Configuración de Desarrollo Local:** Configuración de conexión y variables de entorno
- **Integración de Servicios:** Patrones de comunicación entre servicios y flujos de autenticación
- **Portabilidad Cloud:** Ruta de migración a AWS, Azure o GCP
- **Procedimientos Operacionales:** Health checks, troubleshooting y mantenimiento

### Principios de Diseño

**Arquitectura Remote-First:** El entorno de desarrollo explícitamente no requiere Docker en estaciones de trabajo locales, permitiendo:

- Flexibilidad de hardware (laptops de baja memoria, arquitecturas ARM)
- Topología de desarrollo consistente entre miembros del equipo
- Validación temprana de infraestructura similar a producción
- Onboarding simplificado sin complejidad de orquestación de contenedores

---

## 1. Architecture Overview

### 1.1 Topology Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                    Developer Workstation                     │
│  ┌────────────────┐              ┌────────────────┐          │
│  │   Backend      │              │   Frontend     │          │
│  │  (Nest.js)  │                 │  (Next.js)     │          │
│  │   Port 8080    │              │   Port 3000    │          │
│  └────────┬───────┘              └────────┬───────┘          │
│           │                               │                  │
│           └───────────────┬───────────────┘                  │
│                           │                                  │
│                          .env                                │
│                  (not committed)                             │
└───────────────────────────┼──────────────────────────────────┘
                            │
                    HTTPS over Internet
                            │
┌───────────────────────────┼──────────────────────────────────┐
│                      Railway Platform                         │
│  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────┐ │
│  │   PostgreSQL    │  │    Keycloak      │  │   S3 Bucket │ │
│  │   (App Data)    │  │   (Identity)     │  │ (Documents) │ │
│  │   Port 5432     │  │   Port 8080      │  │ S3 API      │ │
│  └─────────────────┘  └────────┬─────────┘  └─────────────┘ │
│                                 │                             │
│                       ┌─────────┴─────────┐                  │
│                       │   PostgreSQL      │                  │
│                       │ (Keycloak Data)   │                  │
│                       │   Port 5432       │                  │
│                       └───────────────────┘                  │
└──────────────────────────────────────────────────────────────┘
```

### 1.2 Service Inventory

| Service                  | Purpose                 | Provider                     | Connectivity                      | Data Persistence                    |
| ------------------------ | ----------------------- | ---------------------------- | --------------------------------- | ----------------------------------- |
| **Application Database** | Primary data store      | Railway PostgreSQL           | Private network + public endpoint | Persistent volume                   |
| **Identity Provider**    | SSO/OIDC authentication | Keycloak (Railway template)  | Public HTTPS endpoint             | Persistent via dedicated PostgreSQL |
| **Keycloak Database**    | Identity provider state | Railway PostgreSQL           | Private network (Keycloak-only)   | Persistent volume                   |
| **Object Storage**       | Document repository     | Railway S3-compatible bucket | S3 API over HTTPS                 | Persistent object storage           |

### 1.3 Network Architecture

**Connectivity Patterns:**

- **Local → Railway Services:** HTTPS over public internet with TLS 1.3
- **Railway Internal:** Private network for Keycloak ↔ Keycloak DB (no egress charges)
- **Service Discovery:** Railway-provided DNS and connection strings
- **Firewall:** Railway-managed, no manual security group configuration required

**Implementation Suggestion:**

- Use Railway's private networking for inter-service communication when available
- Implement connection pooling (PgBouncer) for database connections
- Add retry logic with exponential backoff for transient network failures

---

## 2. Service Specifications

### 2.1 Application Database (PostgreSQL)

**Service Identifier:** `postgres-app`  
**Purpose:** Primary relational database for application domain data  
**Technology:** Railway PostgreSQL 15+  
**Resource Allocation:** Configurable via Railway dashboard

**Schema Domains:**

- Tenant management and multi-tenancy isolation
- Organization and personnel records
- Document folders and metadata
- Access control events and audit logs
- Vehicle registrations and accreditations
- Cafeteria entitlements and consumption records

**Connection Configuration:**

**Environment Variable:**

```bash
DATABASE_URL=postgresql://user:password@host.railway.app:5432/railway
```

**Connection String Format:**

```
postgresql://[user]:[password]@[host]:[port]/[database]?sslmode=require
```

**Connection Pooling (Recommended):**

```typescript
// Prisma configuration
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")

  // Connection pool settings
  connection_limit = 10
  pool_timeout     = 20
}
```

**Operational Constraints:**

- ❌ NEVER modify credentials manually (managed by Railway)
- ❌ NEVER execute schema changes without migrations
- ✅ ALWAYS use versioned migrations (Prisma Migrate, Alembic, Flyway)
- ✅ ALWAYS include rollback scripts for migrations
- ✅ ALWAYS test migrations on database copy before applying

**Backup Strategy:**

- Railway automatic backups: Daily snapshots (retention per plan)
- Manual backup before major migrations: `pg_dump` to local storage
- Restore procedure documented in runbook

**Performance Monitoring:**

- Enable slow query logging (>100ms)
- Monitor connection pool utilization
- Track query performance with `pg_stat_statements`

**Implementation Suggestion:**

- Use read replicas for reporting queries (when Railway supports)
- Implement query result caching for expensive aggregations
- Add database connection health checks in application startup

---

### 2.2 Identity Provider (Keycloak)

**Service Identifier:** `keycloak-dev`  
**Purpose:** OpenID Connect (OIDC) authentication and authorization provider  
**Technology:** Keycloak 23+ (Railway community template)  
**Deployment Model:** Keycloak + dedicated PostgreSQL database

**Architecture:**

```
┌─────────────────────────────────────────┐
│           Keycloak Service              │
│  ┌───────────────────────────────────┐  │
│  │  Admin Console (Port 8080)        │  │
│  │  - Realm management               │  │
│  │  - Client configuration           │  │
│  │  - User management                │  │
│  └───────────────┬───────────────────┘  │
│                  │                      │
│  ┌───────────────▼───────────────────┐  │
│  │  OIDC Endpoints                   │  │
│  │  - /realms/{realm}/.well-known/   │  │
│  │    openid-configuration           │  │
│  │  - /realms/{realm}/protocol/      │  │
│  │    openid-connect/token           │  │
│  │  - /realms/{realm}/protocol/      │  │
│  │    openid-connect/certs           │  │
│  └───────────────┬───────────────────┘  │
│                  │                      │
│                  ▼                      │
│  ┌───────────────────────────────────┐  │
│  │  PostgreSQL (Keycloak DB)         │  │
│  │  - Realm configuration            │  │
│  │  - User credentials (hashed)      │  │
│  │  - Session state                  │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

**Environment Variables (Keycloak Service):**

**Administrative Access:**

```bash
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=<strong-password>  # Store in password manager
```

**Database Connection (Auto-configured by Railway template):**

```bash
KC_DB=postgres
KC_DB_URL=${{Postgres.DATABASE_URL}}
KC_DB_USERNAME=${{Postgres.PGUSER}}
KC_DB_PASSWORD=${{Postgres.PGPASSWORD}}
```

**Keycloak Configuration:**

```bash
KC_HOSTNAME=keycloak-dev.railway.app
KC_HTTP_ENABLED=false
KC_HTTPS_ENABLED=true
KC_PROXY=edge
KC_HEALTH_ENABLED=true
KC_METRICS_ENABLED=true
```

**Realm Configuration:**

**Recommended Realm Structure:**

```json
{
	"realm": "eaa-dev",
	"enabled": true,
	"sslRequired": "external",
	"registrationAllowed": false,
	"loginWithEmailAllowed": true,
	"duplicateEmailsAllowed": false,
	"resetPasswordAllowed": true,
	"editUsernameAllowed": false,
	"bruteForceProtected": true,
	"permanentLockout": false,
	"maxFailureWaitSeconds": 900,
	"minimumQuickLoginWaitSeconds": 60,
	"waitIncrementSeconds": 60,
	"quickLoginCheckMilliSeconds": 1000,
	"maxDeltaTimeSeconds": 43200,
	"failureFactor": 5
}
```

**Client Configuration (Backend API):**

```json
{
	"clientId": "eaa-backend",
	"enabled": true,
	"protocol": "openid-connect",
	"publicClient": false,
	"bearerOnly": true,
	"standardFlowEnabled": false,
	"directAccessGrantsEnabled": false,
	"serviceAccountsEnabled": false,
	"attributes": {
		"access.token.lifespan": "3600",
		"use.refresh.tokens": "true"
	}
}
```

**Client Configuration (Frontend SPA):**

```json
{
	"clientId": "eaa-frontend",
	"enabled": true,
	"protocol": "openid-connect",
	"publicClient": true,
	"standardFlowEnabled": true,
	"implicitFlowEnabled": false,
	"directAccessGrantsEnabled": false,
	"redirectUris": ["http://localhost:5173/*", "https://dev.example.com/*"],
	"webOrigins": ["http://localhost:5173", "https://dev.example.com"],
	"attributes": {
		"pkce.code.challenge.method": "S256"
	}
}
```

**Operational Procedures:**

**Initial Setup:**

1. Deploy Keycloak template from Railway marketplace
2. Access admin console at `https://<keycloak-domain>/admin`
3. Login with `KEYCLOAK_ADMIN` credentials
4. Create realm `eaa-dev`
5. Configure clients (backend + frontend)
6. Create test users with appropriate roles

**Credential Recovery:**
If admin credentials are lost:

1. Delete Keycloak PostgreSQL database service
2. Redeploy Keycloak with new `KEYCLOAK_ADMIN_PASSWORD`
3. Reconfigure realm and clients (use realm export/import for faster recovery)

**Implementation Suggestion:**

- Export realm configuration to version control (excluding secrets)
- Implement realm-as-code using Keycloak REST API or Terraform
- Add custom themes for branding consistency
- Configure SMTP for password reset emails
- Enable event logging for security auditing
- Implement rate limiting on authentication endpoints

---

### 2.3 Object Storage (S3-Compatible Bucket)

**Service Identifier:** `bucket-documents-dev`  
**Purpose:** Secure storage for uploaded documents (PDFs, images, certificates)  
**Technology:** Railway S3-compatible storage  
**API Compatibility:** AWS S3 API v4 signatures

**Bucket Structure:**

```
bucket-documents-dev/
├── {tenant-id-1}/
│   ├── documents/
│   │   ├── {document-id-1}/
│   │   │   ├── original.pdf
│   │   │   ├── thumbnail.jpg
│   │   │   └── metadata.json
│   │   └── {document-id-2}/
│   │       └── original.png
│   ├── exports/
│   │   └── {export-id}.xlsx
│   └── temp/
│       └── {upload-id}/
└── {tenant-id-2}/
    └── documents/
        └── ...
```

**Environment Variables:**

```bash
# Storage endpoint
STORAGE_ENDPOINT=https://railway.app  # Railway-provided endpoint
STORAGE_REGION=us-east-1              # Railway default region

# Bucket configuration
STORAGE_BUCKET=bucket-documents-dev
STORAGE_PUBLIC_URL=https://bucket-documents-dev.railway.app

# Access credentials
AWS_ACCESS_KEY_ID=AKIA...             # Railway-generated
AWS_SECRET_ACCESS_KEY=...             # Railway-generated

# SDK configuration
AWS_SDK_LOAD_CONFIG=1
AWS_S3_FORCE_PATH_STYLE=false
```

**Access Control Policy:**

**Bucket Policy (Private by Default):**

```json
{
	"Version": "2012-10-17",
	"Statement": [
		{
			"Sid": "DenyPublicAccess",
			"Effect": "Deny",
			"Principal": "*",
			"Action": "s3:GetObject",
			"Resource": "arn:aws:s3:::bucket-documents-dev/*"
		}
	]
}
```

**Presigned URL Configuration:**

```typescript
// Upload presigned URL (15-minute TTL)
const uploadUrl = await s3Client.getSignedUrl('putObject', {
	Bucket: process.env.STORAGE_BUCKET,
	Key: `${tenantId}/documents/${documentId}/original.pdf`,
	ContentType: 'application/pdf',
	Expires: 900, // 15 minutes
});

// Download presigned URL (1-hour TTL)
const downloadUrl = await s3Client.getSignedUrl('getObject', {
	Bucket: process.env.STORAGE_BUCKET,
	Key: `${tenantId}/documents/${documentId}/original.pdf`,
	Expires: 3600, // 1 hour
});
```

**Upload Flow:**

```
1. Client → Backend: Request upload URL
2. Backend: Validate permissions + generate presigned URL
3. Backend → Client: Return presigned URL
4. Client → S3: Direct upload using presigned URL
5. Client → Backend: Notify upload completion
6. Backend: Validate upload + create document record
```

**Download Flow:**

```
1. Client → Backend: Request document download
2. Backend: Validate permissions + document ownership
3. Backend: Generate presigned download URL
4. Backend → Client: Return presigned URL
5. Client → S3: Direct download using presigned URL
```

**Security Constraints:**

- ❌ NEVER expose bucket with public read access
- ❌ NEVER proxy file downloads through backend (bandwidth waste)
- ❌ NEVER store credentials in code (use environment variables)
- ✅ ALWAYS use presigned URLs with short TTL
- ✅ ALWAYS validate tenant ownership before generating URLs
- ✅ ALWAYS log document access in audit trail

**Lifecycle Policies:**

```json
{
	"Rules": [
		{
			"Id": "DeleteTempUploads",
			"Status": "Enabled",
			"Prefix": "*/temp/",
			"Expiration": {
				"Days": 1
			}
		},
		{
			"Id": "ArchiveOldDocuments",
			"Status": "Enabled",
			"Prefix": "*/documents/",
			"Transitions": [
				{
					"Days": 90,
					"StorageClass": "GLACIER"
				}
			]
		}
	]
}
```

**Implementation Suggestion:**

- Implement multipart upload for files >5MB
- Add virus scanning integration (ClamAV, AWS Macie)
- Enable versioning for document audit trail
- Implement content-type validation
- Add automatic thumbnail generation for images
- Configure CORS for direct browser uploads
- Implement storage quota management per tenant

---

## 3. Local Development Configuration

### 3.1 Environment Variables Specification

**File:** `.env.local` (NEVER committed to version control)

**Complete Configuration Template:**

```bash
#──────────────────────────────────────────────────────────────
# Application Configuration
#──────────────────────────────────────────────────────────────
APP_ENV=development
APP_PORT=3000
APP_LOG_LEVEL=debug
NODE_ENV=development

#──────────────────────────────────────────────────────────────
# Database Configuration
#──────────────────────────────────────────────────────────────
DATABASE_URL=postgresql://user:password@host.railway.app:5432/railway?sslmode=require

# Connection pool settings
DB_POOL_MIN=2
DB_POOL_MAX=10
DB_CONNECTION_TIMEOUT=20000
DB_IDLE_TIMEOUT=30000

#──────────────────────────────────────────────────────────────
# Object Storage Configuration (S3-Compatible)
#──────────────────────────────────────────────────────────────
STORAGE_ENDPOINT=https://railway.app
STORAGE_REGION=us-east-1
STORAGE_BUCKET=bucket-documents-dev
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...

# Presigned URL TTL (seconds)
STORAGE_UPLOAD_URL_TTL=900    # 15 minutes
STORAGE_DOWNLOAD_URL_TTL=3600  # 1 hour

#──────────────────────────────────────────────────────────────
# Identity Provider Configuration (Keycloak OIDC)
#──────────────────────────────────────────────────────────────
OIDC_ISSUER_URL=https://keycloak-dev.railway.app/realms/eaa-dev
OIDC_CLIENT_ID=eaa-backend
OIDC_CLIENT_SECRET=<client-secret>  # For confidential clients
OIDC_AUDIENCE=eaa-backend
OIDC_JWKS_URI=https://keycloak-dev.railway.app/realms/eaa-dev/protocol/openid-connect/certs

# Token validation
OIDC_TOKEN_EXPIRATION_LEEWAY=30  # seconds
OIDC_REQUIRED=true

#──────────────────────────────────────────────────────────────
# QR Code Signing Configuration (Development)
#──────────────────────────────────────────────────────────────
QR_SIGNING_ALGORITHM=ES256
QR_SIGNING_KID=dev-key-2025-01
QR_SIGNING_PRIVATE_KEY_PEM="-----BEGIN EC PRIVATE KEY-----\n...\n-----END EC PRIVATE KEY-----"
QR_SIGNING_PUBLIC_KEY_PEM="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
QR_TOKEN_TTL_SECONDS=3600  # 1 hour

#──────────────────────────────────────────────────────────────
# CORS Configuration
#──────────────────────────────────────────────────────────────
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
CORS_CREDENTIALS=true

#──────────────────────────────────────────────────────────────
# Notification Configuration (Development)
#──────────────────────────────────────────────────────────────
NOTIFICATION_ADAPTER=console  # console | smtp | ses
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=noreply@eaa-dev.local

#──────────────────────────────────────────────────────────────
# Feature Flags
#──────────────────────────────────────────────────────────────
FEATURE_BIOMETRIC_AUTH=false
FEATURE_VEHICLE_LPR=false
FEATURE_ADVANCED_ANALYTICS=false

#──────────────────────────────────────────────────────────────
# Monitoring and Observability
#──────────────────────────────────────────────────────────────
ENABLE_METRICS=true
ENABLE_TRACING=false
SENTRY_DSN=  # Optional: Sentry error tracking
```

### 3.2 Configuration Validation

**Startup Validation Script:**

```typescript
import { z } from 'zod';

const configSchema = z.object({
	// Application
	APP_ENV: z.enum(['development', 'staging', 'production']),
	APP_PORT: z.coerce.number().int().positive(),

	// Database
	DATABASE_URL: z.string().url().startsWith('postgresql://'),

	// Storage
	STORAGE_ENDPOINT: z.string().url(),
	STORAGE_BUCKET: z.string().min(1),
	AWS_ACCESS_KEY_ID: z.string().min(1),
	AWS_SECRET_ACCESS_KEY: z.string().min(1),

	// OIDC
	OIDC_ISSUER_URL: z.string().url(),
	OIDC_CLIENT_ID: z.string().min(1),
	OIDC_JWKS_URI: z.string().url(),

	// QR Signing
	QR_SIGNING_KID: z.string().min(1),
	QR_SIGNING_PRIVATE_KEY_PEM: z.string().includes('BEGIN EC PRIVATE KEY'),
	QR_SIGNING_PUBLIC_KEY_PEM: z.string().includes('BEGIN PUBLIC KEY'),
});

export function validateConfig() {
	try {
		return configSchema.parse(process.env);
	} catch (error) {
		console.error('❌ Configuration validation failed:');
		console.error(error.errors);
		process.exit(1);
	}
}
```

### 3.3 Connection Testing

**Health Check Script:**

```typescript
import { PrismaClient } from '@prisma/client';
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';
import axios from 'axios';

async function checkDatabaseConnection() {
	const prisma = new PrismaClient();
	try {
		await prisma.$queryRaw`SELECT 1`;
		console.log('✅ Database connection: OK');
		return true;
	} catch (error) {
		console.error('❌ Database connection: FAILED', error.message);
		return false;
	} finally {
		await prisma.$disconnect();
	}
}

async function checkStorageConnection() {
	const s3 = new S3Client({
		endpoint: process.env.STORAGE_ENDPOINT,
		region: process.env.STORAGE_REGION,
		credentials: {
			accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
			secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
		},
	});

	try {
		await s3.send(
			new HeadBucketCommand({
				Bucket: process.env.STORAGE_BUCKET,
			}),
		);
		console.log('✅ Storage connection: OK');
		return true;
	} catch (error) {
		console.error('❌ Storage connection: FAILED', error.message);
		return false;
	}
}

async function checkOIDCConnection() {
	try {
		const response = await axios.get(
			`${process.env.OIDC_ISSUER_URL}/.well-known/openid-configuration`,
		);
		console.log('✅ OIDC provider: OK');
		console.log(`   Issuer: ${response.data.issuer}`);
		return true;
	} catch (error) {
		console.error('❌ OIDC provider: FAILED', error.message);
		return false;
	}
}

async function runHealthChecks() {
	console.log('🔍 Running infrastructure health checks...\n');

	const results = await Promise.all([
		checkDatabaseConnection(),
		checkStorageConnection(),
		checkOIDCConnection(),
	]);

	const allHealthy = results.every((r) => r);

	if (allHealthy) {
		console.log('\n✅ All services healthy');
		process.exit(0);
	} else {
		console.log('\n❌ Some services unhealthy');
		process.exit(1);
	}
}

runHealthChecks();
```

---

## 4. Operational Procedures

### 4.1 Environment Health Checklist

**Pre-Development Verification:**

- [ ] **Database Service**
  - [ ] Service status: Active (Railway dashboard)
  - [ ] Connection test: `psql $DATABASE_URL -c "SELECT 1"`
  - [ ] Disk usage: <80% capacity
  - [ ] No error logs in Railway console

- [ ] **Keycloak Service**
  - [ ] Service status: Active
  - [ ] Admin console accessible: `https://<keycloak-domain>/admin`
  - [ ] Realm configured: `eaa-dev` exists
  - [ ] Clients configured: `eaa-backend`, `eaa-frontend`
  - [ ] Test user created with appropriate roles
  - [ ] OIDC discovery endpoint responding: `/.well-known/openid-configuration`

- [ ] **Keycloak Database**
  - [ ] Service status: Active
  - [ ] No connection errors in Keycloak logs
  - [ ] Backup recent (<24 hours)

- [ ] **Object Storage**
  - [ ] Bucket exists and accessible
  - [ ] Credentials valid (test with AWS CLI or SDK)
  - [ ] Presigned URL generation working
  - [ ] Storage quota not exceeded

- [ ] **Local Configuration**
  - [ ] `.env.local` file exists
  - [ ] All required variables populated
  - [ ] Configuration validation passes
  - [ ] Health check script passes

### 4.2 Troubleshooting Guide

**Issue: Database Connection Timeout**

**Symptoms:**

```
Error: P1001: Can't reach database server at host.railway.app:5432
```

**Resolution Steps:**

1. Verify Railway service status (dashboard)
2. Check DATABASE_URL format and credentials
3. Test connection with `psql` directly
4. Verify firewall/VPN not blocking port 5432
5. Check Railway service logs for errors
6. Restart database service if necessary

**Issue: Keycloak Admin Console Inaccessible**

**Symptoms:**

```
502 Bad Gateway or Connection Refused
```

**Resolution Steps:**

1. Check Keycloak service status (Railway dashboard)
2. Verify Keycloak database is running
3. Check Keycloak logs for startup errors
4. Verify `KEYCLOAK_ADMIN_PASSWORD` is set
5. Restart Keycloak service
6. If persistent, redeploy Keycloak template

**Issue: S3 Presigned URL Generation Fails**

**Symptoms:**

```
SignatureDoesNotMatch: The request signature we calculated does not match
```

**Resolution Steps:**

1. Verify `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are correct
2. Check `STORAGE_ENDPOINT` format (include https://)
3. Verify `STORAGE_REGION` matches bucket region
4. Test credentials with AWS CLI: `aws s3 ls s3://<bucket> --endpoint-url=<endpoint>`
5. Regenerate credentials in Railway dashboard if necessary

**Issue: OIDC Token Validation Fails**

**Symptoms:**

```
JsonWebTokenError: invalid signature
```

**Resolution Steps:**

1. Verify `OIDC_ISSUER_URL` matches Keycloak realm URL exactly
2. Check `OIDC_JWKS_URI` is accessible and returns public keys
3. Verify token `iss` claim matches `OIDC_ISSUER_URL`
4. Check system clock synchronization (NTP)
5. Verify Keycloak client configuration (algorithm, keys)

### 4.3 Backup and Recovery

**Database Backup:**

```bash
# Manual backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
psql $DATABASE_URL < backup_20251227_020000.sql
```

**Keycloak Realm Export:**

```bash
# Export realm configuration
curl -X GET \
  "https://<keycloak-domain>/admin/realms/eaa-dev" \
  -H "Authorization: Bearer <admin-token>" \
  > realm-export.json

# Import realm configuration
# (Use Keycloak admin console: Realm Settings → Partial Import)
```

**Storage Backup:**

```bash
# Sync bucket to local storage
aws s3 sync s3://<bucket> ./backup-storage \
  --endpoint-url=<endpoint>
```

### 4.4 Cost Optimization

**Railway Resource Usage:**

**Database Optimization:**

- Use connection pooling to reduce connection overhead
- Implement query result caching for expensive queries
- Archive old data to reduce database size
- Monitor slow queries and add indexes

**Storage Optimization:**

- Use presigned URLs for direct client uploads/downloads (avoid backend proxy)
- Implement lifecycle policies to delete temporary files
- Compress documents before upload when possible
- Use appropriate storage classes (standard vs. archive)

**Network Optimization:**

- Leverage Railway private networking for inter-service communication
- Minimize data transfer between services
- Implement CDN for static assets (future)

**Estimated Monthly Costs (Development):**

- PostgreSQL (App): $5-10 (Starter plan)
- PostgreSQL (Keycloak): $5-10 (Starter plan)
- Keycloak Service: $5 (compute)
- S3 Storage: $0.50-2 (per GB)
- **Total:** ~$15-30/month

---

## 5. Security Guidelines

### 5.1 Development Security Posture

**Data Classification:**

- ❌ NEVER use production data in development
- ❌ NEVER use real PII (personal identifiable information)
- ✅ ALWAYS use synthetic test data
- ✅ ALWAYS anonymize data if copying from production

**Credential Management:**

- ❌ NEVER commit `.env.local` to version control
- ❌ NEVER share credentials via chat/email
- ❌ NEVER use weak passwords (minimum 16 characters)
- ✅ ALWAYS store credentials in password manager (1Password, LastPass, Bitwarden)
- ✅ ALWAYS rotate credentials quarterly
- ✅ ALWAYS use unique passwords per service

**Access Control:**

- Keycloak admin access: Limited to 2-3 team members
- Railway project access: Role-based (admin, developer, viewer)
- Database direct access: Only for emergencies (use migrations)
- Storage bucket access: Only via application (no direct access)

**Network Security:**

- All connections MUST use TLS 1.3
- Verify SSL certificates (no self-signed in dev)
- Use Railway private networking when available
- Implement rate limiting on authentication endpoints

### 5.2 Secrets Rotation Schedule

| Secret                  | Rotation Frequency | Procedure                                                                      |
| ----------------------- | ------------------ | ------------------------------------------------------------------------------ |
| Database password       | Quarterly          | Railway dashboard → Regenerate → Update `.env.local`                           |
| Storage credentials     | Quarterly          | Railway dashboard → Regenerate → Update `.env.local`                           |
| Keycloak admin password | Quarterly          | Keycloak console → Update → Store in password manager                          |
| QR signing keys         | Every 90 days      | Generate new key pair → Update config → Maintain old key for validation period |
| OIDC client secrets     | Annually           | Keycloak console → Regenerate → Update backend config                          |

### 5.3 Incident Response

**Security Incident Classification:**

- **P0 (Critical):** Credential leak, unauthorized access, data breach
- **P1 (High):** Service compromise, malware detection
- **P2 (Medium):** Suspicious activity, failed login attempts
- **P3 (Low):** Policy violation, configuration drift

**Response Procedure (P0):**

1. **Immediate:** Rotate all compromised credentials
2. **Containment:** Disable affected services/accounts
3. **Investigation:** Review audit logs for unauthorized access
4. **Remediation:** Apply security patches, update configurations
5. **Communication:** Notify team and stakeholders
6. **Post-Mortem:** Document incident and preventive measures

---

## 6. Migration Path to Production

### 6.1 Cloud Provider Migration

**Railway → AWS Migration:**

| Railway Service | AWS Equivalent                    | Migration Complexity           |
| --------------- | --------------------------------- | ------------------------------ |
| PostgreSQL      | RDS PostgreSQL                    | Low (connection string change) |
| S3 Bucket       | S3                                | Low (adapter configuration)    |
| Keycloak        | Self-hosted on ECS/EKS or Cognito | Medium (OIDC adapter swap)     |

**Migration Checklist:**

- [ ] Provision AWS services (RDS, S3, Cognito/ECS)
- [ ] Update adapter configurations (connection strings)
- [ ] Migrate database schema (pg_dump → restore)
- [ ] Sync storage buckets (aws s3 sync)
- [ ] Update DNS records
- [ ] Test all integrations
- [ ] Update documentation

### 6.2 Production Readiness Checklist

- [ ] **Infrastructure**
  - [ ] High-availability database (multi-AZ)
  - [ ] Automated backups configured
  - [ ] CDN for static assets
  - [ ] Load balancer for backend

- [ ] **Security**
  - [ ] Secrets in AWS Secrets Manager/Vault
  - [ ] TLS certificates from trusted CA
  - [ ] WAF configured
  - [ ] DDoS protection enabled

- [ ] **Monitoring**
  - [ ] Application metrics (Prometheus/CloudWatch)
  - [ ] Error tracking (Sentry)
  - [ ] Log aggregation (CloudWatch Logs/ELK)
  - [ ] Uptime monitoring (Pingdom/UptimeRobot)

- [ ] **Compliance**
  - [ ] Data retention policies implemented
  - [ ] Audit logging enabled
  - [ ] GDPR compliance verified
  - [ ] Security audit completed

---

## Appendix A: Quick Reference

### A.1 Essential Commands

**Database:**

```bash
# Connect to database
psql $DATABASE_URL

# Run migrations
npm run db:migrate

# Seed database
npm run db:seed

# Backup database
pg_dump $DATABASE_URL > backup.sql
```

**Storage:**

```bash
# List bucket contents
aws s3 ls s3://$STORAGE_BUCKET --endpoint-url=$STORAGE_ENDPOINT

# Upload file
aws s3 cp file.pdf s3://$STORAGE_BUCKET/test/ --endpoint-url=$STORAGE_ENDPOINT

# Download file
aws s3 cp s3://$STORAGE_BUCKET/test/file.pdf . --endpoint-url=$STORAGE_ENDPOINT
```

**Keycloak:**

```bash
# Get admin token
curl -X POST "https://<keycloak-domain>/realms/master/protocol/openid-connect/token" \
  -d "client_id=admin-cli" \
  -d "username=$KEYCLOAK_ADMIN" \
  -d "password=$KEYCLOAK_ADMIN_PASSWORD" \
  -d "grant_type=password"

# List realms
curl -X GET "https://<keycloak-domain>/admin/realms" \
  -H "Authorization: Bearer <token>"
```

### A.2 Useful Links

- **Railway Dashboard:** https://railway.app/dashboard
- **Keycloak Documentation:** https://www.keycloak.org/documentation
- **AWS S3 API Reference:** https://docs.aws.amazon.com/AmazonS3/latest/API/
- **PostgreSQL Documentation:** https://www.postgresql.org/docs/

---

**Document Version:** 1.0.0  
**Last Updated:** 2025-12-27  
**Next Review:** 2026-01-27  
**Maintained By:** Platform Engineering Team
