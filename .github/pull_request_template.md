## Description

<!-- Describe your changes in detail -->

## Type of Change

- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📝 Documentation update
- [ ] ♻️ Code refactoring
- [ ] ⚡ Performance improvement
- [ ] 🧪 Test update

## Module/Domain

- [ ] auth
- [ ] health
- [ ] documental
- [ ] access
- [ ] vehicle
- [ ] casino
- [ ] core/shared
- [ ] infrastructure
- [ ] ci/cd

## Architectural Compliance Checklist

- [ ] Follows Hexagonal Architecture (domain/application layers don't import infrastructure)
- [ ] Port interfaces used for external dependencies
- [ ] Multi-tenancy enforced (all queries filter by `tenant_id`)
- [ ] Audit logging implemented for critical operations
- [ ] Reason codes used (no free-form error messages)
- [ ] Type-safe implementation (no `any` types without justification)

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated (if applicable)
- [ ] All tests passing locally

## Documentation

- [ ] Code is self-documenting with clear naming
- [ ] Complex logic has explanatory comments
- [ ] API documentation updated (Swagger annotations)
- [ ] Environment variables documented in [.env.example](cci:7://file:///C:/Users/demodogo/Documents/code/EAA/eaa-hono-igris/.env.example:0:0-0:0)
- [ ] AGENTS.md updated (if architectural changes)

## Related Issues

<!-- Link related issues: Closes #123, Fixes #456 -->

## Screenshots (if applicable)

<!-- Add screenshots for UI changes -->

## Additional Notes

<!-- Any additional information for reviewers -->
