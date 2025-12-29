# EAA - Sistema de Acreditación y Control de Acceso Empresarial

**Versión:** 0.0.1  
**Estado:** Desarrollo Activo  
**Arquitectura:** Modular Monolith con Hexagonal Architecture  
**Framework:** NestJS + TypeScript

---

## Descripción General

Sistema de gestión de acreditaciones y control operacional de nivel empresarial diseñado para entornos industriales y corporativos que requieren cumplimiento normativo, control de acceso granular y resiliencia operacional.

### Capacidades Principales

- **Control Documental:** Gestión del ciclo de vida de documentos con flujos de aprobación multi-etapa
- **Control de Acceso Físico:** Evaluación de políticas en tiempo real con autenticación basada en QR
- **Gestión de Vehículos:** Acreditación de vehículos y autorización de acceso
- **Control de Casino:** Gestión de derechos de comida y seguimiento de consumo
- **Multi-Tenancy:** Aislamiento completo de datos con operaciones conscientes del tenant
- **Audit Trail:** Registro exhaustivo de eventos con almacenamiento a prueba de manipulación

---

## Arquitectura

### Principios de Diseño

- **Modular Monolith:** Artefacto desplegable único con límites de módulos explícitos
- **Hexagonal Architecture:** Separación clara entre capas de dominio, aplicación, infraestructura e interfaz
- **Desarrollo Remote-First:** No requiere Docker para desarrollo local
- **Portabilidad Cloud:** Infraestructura abstraída detrás de interfaces port

### Estructura de Módulos

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

### Capas Arquitectónicas

- **Domain Layer:** Lógica de negocio pura, cero dependencias de frameworks
- **Application Layer:** Orquestación de casos de uso, interfaces port
- **Infrastructure Layer:** Implementaciones concretas (database, storage, OIDC)
- **Interface Layer:** Controladores HTTP, validadores, presentadores

> **Nota:** Consulta `AGENTS.md` para directrices arquitectónicas completas y estándares de ingeniería.

---

## Stack Tecnológico

### Framework Principal

- **NestJS 11.x** - Enterprise Node.js framework
- **TypeScript 5.x** - Type-safe development
- **RxJS 7.x** - Reactive programming

### Autenticación y Seguridad

- **OpenID Connect (OIDC)** - SSO authentication via Keycloak
- **jsonwebtoken** - JWT token handling
- **jwks-rsa** - JWKS key resolution

### Validación y Transformación

- **class-validator** - DTO validation
- **class-transformer** - Object transformation
- **Zod** - Schema validation

### Documentación de API

- **@nestjs/swagger** - OpenAPI/Swagger integration

### Infraestructura (Servicios Remotos)

- **PostgreSQL** - Almacenamiento de datos principal (Railway)
- **S3-Compatible Storage** - Repositorio de documentos (Railway Buckets)
- **Keycloak** - Proveedor de identidad (Railway)

---

## Comenzando

### Prerequisitos

- **Node.js:** 18.x o superior
- **npm:** 9.x o superior
- **Servicios Remotos:** Acceso a infraestructura Railway (PostgreSQL, S3, Keycloak)

### Instalación

```bash
# Clonar repositorio
git clone <repository-url>
cd eaa-nest-igris

# Instalar dependencias
npm install

# Configurar entorno
cp .env.example .env
# Editar .env con tus credenciales
```

### Configuración de Entorno

Crea un archivo `.env` basado en `.env.example`:

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

### Desarrollo

```bash
# Iniciar servidor de desarrollo con hot reload
npm run start:dev

# Iniciar con modo debug
npm run start:debug

# Construir para producción
npm run build

# Iniciar servidor de producción
npm run start:prod
```

### Testing (Pruebas)

```bash
# Ejecutar pruebas unitarias
npm test

# Ejecutar pruebas en modo watch
npm test:watch

# Ejecutar pruebas con cobertura
npm test:cov

# Ejecutar pruebas e2e
npm run test:e2e
```

### Calidad de Código

```bash
# Analizar código
npm run lint

# Formatear código
npm run format
```

---

## Documentación de API

Una vez que la aplicación esté ejecutándose, accede a la documentación interactiva de la API:

- **Swagger UI:** `http://localhost:3001/api/docs`
- **OpenAPI Spec:** `http://localhost:3001/api/docs-json`

---

## Estructura del Proyecto

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

## Filosofía de Desarrollo

### Arquitectura Remote-First

Este proyecto adopta un **modelo de desarrollo remote-first** que no requiere Docker para desarrollo local.

**Beneficios:**

- Flexibilidad de hardware (soporta laptops de baja memoria, arquitecturas ARM)
- Onboarding más rápido sin problemas de licenciamiento de Docker Desktop
- La topología de desarrollo refleja el despliegue cloud de producción
- Consumo reducido de recursos locales

**Requisitos:**

- Conectividad a internet estable
- Acceso a infraestructura remota (servicios Railway)
- Variables de entorno configuradas correctamente

### Hexagonal Architecture

Todas las dependencias de infraestructura están abstraídas detrás de **interfaces port**:

```typescript
// ✅ Domain/Application layers depend on ports
import { OidcClientPort } from '../application/ports/oidc-client.port';

// ❌ Never import concrete implementations in domain/application
import { OidcClient } from '../infrastructure/oidc.client';
```

Esto permite:

- **Testabilidad:** Fácil simulación de infraestructura
- **Portabilidad Cloud:** Cambiar proveedores sin modificar lógica de negocio
- **Clean Architecture:** Separación clara de responsabilidades

---

## Estado de Desarrollo de Módulos

| Módulo         | Estado         | Descripción                             |
| -------------- | -------------- | --------------------------------------- |
| **auth**       | ✅ Activo      | Autenticación OIDC, validación JWT      |
| **health**     | ✅ Activo      | Endpoints de health check               |
| **documental** | 🚧 Planificado | Gestión del ciclo de vida de documentos |
| **access**     | 🚧 Planificado | Control de acceso físico                |
| **vehicle**    | 🚧 Planificado | Acreditación de vehículos               |
| **casino**     | 🚧 Planificado | Control de casino/comedor               |
| **reporting**  | 🚧 Planificado | Analítica y reportes                    |

---

## Patrones Arquitectónicos Clave

### Multi-Tenancy

Todas las entidades de base de datos incluyen `tenant_id` para aislamiento completo de datos:

```typescript
// ✅ Tenant-aware query
const document = await db.documents.findUnique({
	where: {
		id: documentId,
		tenant_id: userContext.tenantId,
	},
});
```

### Policy Evaluator

Motor de autorización determinístico que retorna `ALLOW` o `DENY` con códigos de razón estructurados:

```typescript
interface EvaluationResult {
	decision: 'ALLOW' | 'DENY';
	reason_codes: string[]; // e.g., ['DOC_EXPIRED', 'OUTSIDE_TIME_WINDOW']
	evaluated_at: Date;
}
```

### Audit Trail

Todas las operaciones críticas generan eventos de auditoría inmutables:

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

## Contribución

### Estándares de Código

1. **Seguir Hexagonal Architecture:** Las capas domain/application no deben importar infrastructure
2. **Port Interfaces:** Todas las dependencias externas detrás de interfaces port
3. **Multi-Tenancy:** Siempre filtrar por `tenant_id`
4. **Audit Logging:** Registrar todas las operaciones críticas
5. **Reason Codes:** Usar códigos estructurados, no texto libre
6. **Type Safety:** Aprovechar TypeScript estrictamente

### Checklist de Pull Request

- [ ] El código sigue las directrices arquitectónicas en `AGENTS.md`
- [ ] Pruebas unitarias agregadas/actualizadas
- [ ] Pruebas de integración para nuevas funcionalidades
- [ ] Documentación de API actualizada (anotaciones Swagger)
- [ ] Variables de entorno documentadas en `.env.example`
- [ ] Sin imports de frameworks en capas domain/application

---

## Documentación

- **`AGENTS.md`** - Directrices arquitectónicas completas y estándares de ingeniería
- **`docs/hitos/`** - Hitos del proyecto y fases de desarrollo
- **`docs/DEVELOPMENT_INFRA.md`** - Configuración de infraestructura y despliegue

---

## Licencia

UNLICENSED - Privado/Propietario

---

## Soporte

Para preguntas o problemas:

1. Revisa `AGENTS.md` para orientación arquitectónica
2. Consulta la documentación de API en `/api/docs`
3. Contacta al equipo de desarrollo

---

**Construido con ❤️ para control de acceso de nivel empresarial**
