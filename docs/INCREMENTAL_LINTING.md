# Incremental Linting Workflow

This document describes the incremental linting approach implemented in the DFS App project.

## Overview

The incremental linting workflow ensures that **only new or modified files** are subject to strict linting rules during commits, while existing files with warnings can be cleaned up gradually over time.

## How It Works

### 1. Pre-commit Hook Enforcement

When you commit changes, the pre-commit hook will:

1. **TypeScript Check**: Run type checking on the entire codebase
2. **Incremental Linting**: Run ESLint **only on staged files** (new/modified files)
3. **Tests**: Run all tests to ensure functionality

### 2. Linting Rules

- **Staged Files (New/Modified)**: Must pass all linting rules (strict mode)
- **Existing Files**: Can have warnings that don't block commits
- **Gradual Cleanup**: Developers can fix warnings in existing files when they work on them

## Usage

### Automatic (Pre-commit Hook)

The linting happens automatically when you commit:

```bash
git add .
git commit -m "Your commit message"
# Pre-commit hook runs lint-staged.sh --strict automatically
```

### Manual Commands

You can run the incremental linting manually:

```bash
# Check linting on staged files only
cd web
npm run lint:staged

# Auto-fix linting issues on staged files
cd web
npm run lint:staged:fix

# Check all files (existing behavior)
cd web
npm run lint
```

### Script Options

The `lint-staged.sh` script supports several options:

```bash
# Basic check on staged files
./scripts/lint-staged.sh

# Auto-fix issues on staged files
./scripts/lint-staged.sh --fix

# Strict mode (blocks commit on warnings)
./scripts/lint-staged.sh --strict

# Combine options
./scripts/lint-staged.sh --fix --strict
```

## Benefits

### 1. **Gradual Improvement**
- New code follows strict standards immediately
- Existing code can be cleaned up incrementally
- No need to fix all warnings at once

### 2. **Development Velocity**
- Developers can commit working code even if other files have warnings
- Focus on fixing warnings in files they're actively working on
- Reduced context switching

### 3. **Quality Assurance**
- New/modified files maintain high quality standards
- Prevents introduction of new linting issues
- Ensures consistent code style for new development

## Workflow Examples

### Scenario 1: New Feature Development

```bash
# Create new component
touch src/components/NewComponent.tsx

# Add to staging
git add src/components/NewComponent.tsx

# Commit (will lint only NewComponent.tsx)
git commit -m "Add new component"
# ✅ Passes if NewComponent.tsx is clean
# ❌ Fails if NewComponent.tsx has linting issues
```

### Scenario 2: Modifying Existing File

```bash
# Modify existing file with warnings
vim src/components/ExistingComponent.tsx

# Add to staging
git add src/components/ExistingComponent.tsx

# Commit (will lint only ExistingComponent.tsx)
git commit -m "Update existing component"
# ✅ Passes if ExistingComponent.tsx is clean after changes
# ❌ Fails if ExistingComponent.tsx has new linting issues
```

### Scenario 3: Fixing Warnings

```bash
# Fix warnings in existing file
vim src/components/ComponentWithWarnings.tsx

# Auto-fix some issues
npm run lint:staged:fix

# Add to staging
git add src/components/ComponentWithWarnings.tsx

# Commit
git commit -m "Fix linting warnings in component"
```

## Configuration

### ESLint Configuration

The project uses a lenient ESLint configuration that treats many issues as warnings:

```javascript
// eslint.config.mjs
rules: {
  "@typescript-eslint/no-explicit-any": "warn",
  "react/no-unescaped-entities": "warn",
  "@typescript-eslint/no-unused-vars": "warn",
  // ... other rules set to "warn"
}
```

### Pre-commit Hook

The pre-commit hook enforces:
- TypeScript type checking (entire codebase)
- ESLint on staged files only (strict mode)
- Test execution (entire test suite)

## Troubleshooting

### Linting Fails on Staged Files

```bash
# Auto-fix what can be fixed automatically
npm run lint:staged:fix

# Check what's left to fix manually
npm run lint:staged

# Fix remaining issues manually
# Then commit again
```

### Want to Fix All Warnings

```bash
# Check all files
npm run lint

# Auto-fix all files
npm run lint -- --fix

# Fix remaining issues manually
# Then commit in smaller chunks
```

### Bypass Linting (Not Recommended)

```bash
# Skip pre-commit hook (not recommended)
git commit --no-verify -m "Skip linting"
```

## Best Practices

1. **Fix Warnings When Working on Files**: When you modify a file, take the opportunity to clean up its warnings
2. **Use Auto-fix**: Run `npm run lint:staged:fix` before committing
3. **Small Commits**: Commit frequently to catch issues early
4. **Gradual Cleanup**: Set aside time periodically to clean up warnings in files you haven't touched
5. **Team Communication**: Discuss linting standards and priorities with your team

## Migration Strategy

For teams adopting this approach:

1. **Phase 1**: Implement incremental linting (current state)
2. **Phase 2**: Gradually fix warnings in frequently modified files
3. **Phase 3**: Consider tightening rules for specific file types or directories
4. **Phase 4**: Eventually move to stricter rules as codebase quality improves

This approach balances code quality with development velocity, allowing teams to maintain high standards for new code while gradually improving existing code.
