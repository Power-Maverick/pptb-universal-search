# Conventional Commits Guide

This project uses [Conventional Commits](https://www.conventionalcommits.org/) for automatic semantic versioning and release generation.

## Commit Message Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

## Types

- **feat**: A new feature (triggers minor version bump)
- **fix**: A bug fix (triggers patch version bump)
- **perf**: A performance improvement (triggers patch version bump)
- **docs**: Documentation changes (triggers patch version bump if scope is README)
- **style**: Code style changes (formatting, missing semicolons, etc.)
- **refactor**: Code refactoring without feature changes
- **test**: Adding or updating tests
- **build**: Changes to build system or dependencies
- **ci**: Changes to CI configuration
- **chore**: Other changes that don't modify src or test files
- **revert**: Reverts a previous commit

## Breaking Changes

Add `BREAKING CHANGE:` in the footer or append `!` after type/scope to trigger major version bump:

```
feat!: drop support for Node 16
```

## Examples

```bash
feat: add search result export functionality
fix: resolve memory leak in metadata cache
perf: optimize search query performance
docs: update README with new search options
feat(ui): add dark theme support
fix(search)!: change search API return format

BREAKING CHANGE: search results now return arrays instead of objects
```

## Automatic Release Process

1. **Push to main** - Triggers the release workflow
2. **Semantic analysis** - Analyzes commits since last release
3. **Version calculation** - Determines next version based on commit types
4. **Release creation** - Creates GitHub release with changelog
5. **NPM publishing** - Publishes to npm registry
6. **Git tagging** - Tags the release in Git

## Version Bumps

- **Major** (1.0.0 → 2.0.0): Breaking changes
- **Minor** (1.0.0 → 1.1.0): New features
- **Patch** (1.0.0 → 1.0.1): Bug fixes and improvements

No manual version changes needed - everything is automated!