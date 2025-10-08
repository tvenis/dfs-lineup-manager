# Scripts Directory

This directory contains utility scripts for the DFS App project.

## TypeScript and Code Quality Scripts

### `check-types.sh`

A comprehensive script that runs TypeScript type checking and ESLint linting on the web application.

**Usage:**
```bash
# Run all checks
./scripts/check-types.sh

# Run checks with auto-fix for ESLint issues
./scripts/check-types.sh --fix
```

**What it does:**
1. **TypeScript Type Check**: Runs `npm run type-check` to verify type safety
2. **ESLint Check**: Runs `npm run lint` to check code style and quality
3. **Auto-fix**: With `--fix` flag, automatically fixes some ESLint issues

**Exit Codes:**
- `0`: All checks passed
- `1`: TypeScript errors found (blocks commit)
- ESLint warnings are shown but don't block commits

## Pre-commit Hook

The project includes a pre-commit hook (`.git/hooks/pre-commit`) that automatically runs:
1. TypeScript type checking (fails commit if errors found)
2. ESLint checking (shows warnings but allows commit)

**Features:**
- ✅ Prevents commits with TypeScript errors
- ⚠️ Shows ESLint warnings but doesn't block commits
- 🔍 Provides helpful error messages and tips
- 📦 Only runs on the `web/` directory

## Workflow

### Before Committing
The pre-commit hook automatically runs these checks. If you want to run them manually:

```bash
# Quick check
./scripts/check-types.sh

# Fix issues automatically
./scripts/check-types.sh --fix

# Or run individual checks
cd web
npm run type-check  # TypeScript only
npm run lint        # ESLint only
```

### Testing Integration

The project now includes comprehensive testing as part of the commit process:

```bash
# Run all checks including tests
./scripts/check-types.sh --all

# Run tests separately
./web/scripts/run-tests.sh

# Run tests with coverage
./web/scripts/run-tests.sh --coverage

# Run tests in watch mode
./web/scripts/run-tests.sh --watch
```

### CI/CD Integration
The same checks run in GitHub Actions to ensure code quality in pull requests and deployments. Tests are automatically run in CI/CD pipelines.

## Troubleshooting

### TypeScript Errors
- Fix type errors before committing
- Use proper type annotations instead of `any`
- Handle `undefined` cases with nullish coalescing (`??`)

### ESLint Warnings
- Run with `--fix` to auto-fix some issues
- Review and fix remaining warnings manually
- Consider disabling specific rules if needed

### Testing Issues
- Run `./web/scripts/run-tests.sh` to run tests manually
- Use `--verbose` flag for detailed test output
- Check test files in `web/src/__tests__/` directory
- Ensure all dependencies are installed with `npm install --legacy-peer-deps`

### Pre-commit Hook Issues
- Ensure the hook is executable: `chmod +x .git/hooks/pre-commit`
- Check that you're in the project root directory
- Verify the `web/` directory exists
