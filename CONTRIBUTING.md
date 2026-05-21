# Contributing

This is a solo project. This file defines the commit conventions to follow when making changes.

---

## Commit Message Format

```
<type>(<scope>): <subject>
```

- **Subject:** 72 characters max, imperative mood, no period
- **Scope:** service or area changed — e.g. `hotel-service`, `gateway`, `docs`, `ci`

## Types

| Type | When to use |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `chore` | Tooling, config, dependencies |
| `docs` | Documentation files |
| `ci` | GitHub Actions workflows |
| `test` | Adding or updating tests |
| `refactor` | Code change that is neither fix nor feature |

## Atomic Commits

Each commit must represent one logical unit of work. Do not bundle unrelated changes or commit broken builds.
