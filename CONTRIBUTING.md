# Contributing

This is a solo project. This file defines the commit conventions Claude must follow when making changes.

---

## Commit Message Format

```
<type>(<scope>): <subject>
```

### Rules

- **Subject line:** 72 characters max, imperative mood, no period at the end
- **Scope:** the service or area changed (e.g. `hotel-service`, `gateway`, `docs`, `ci`)
- **Body:** wrap at 72 characters, explain *why* not *what*
- **No co-author lines**

### Types

| Type | When to use |
|---|---|
| `feat` | New feature or capability |
| `fix` | Bug fix |
| `chore` | Tooling, config, dependencies, scaffolding |
| `docs` | README, CONTRIBUTING, comments, documentation files |
| `ci` | GitHub Actions workflows |
| `test` | Adding or updating tests |
| `refactor` | Code change that is neither a fix nor a feature |
| `style` | Formatting only, no logic change |

### Examples

```
chore(hotel-service): scaffold project with EF Core and JWT auth

feat(hotel-service): implement SELECT FOR UPDATE booking transaction

fix(gateway): resolve Ocelot route conflict for /api/v1/search

docs: add README, LICENSE, and CONTRIBUTING

ci(hotel-service): add GitHub Actions workflow with path filtering
```

---

## Atomic Commits

Each commit must represent one logical unit of work:

- One service scaffold = one commit
- One feature = one commit
- Do not bundle unrelated changes
- Do not commit broken builds
