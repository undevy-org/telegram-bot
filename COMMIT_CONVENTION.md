# Commit Message Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/) specification.

## Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

## Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, semicolons, etc)
- **refactor**: Code refactoring without feature changes
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **chore**: Maintenance tasks

## Examples

```bash
feat: add analytics dashboard command
fix: correct timezone in visitor notifications
docs: update command descriptions in README
refactor: modularize command handlers
chore: update dependencies
```

## Breaking Changes

For breaking changes, add `BREAKING CHANGE:` in the footer:

```bash
feat: change command syntax for case editing

BREAKING CHANGE: edit commands now use /edit_case_[id] format instead of /edit [id]
```

These conventions enable:
- Automatic version bumping
- CHANGELOG generation
- Clear commit history