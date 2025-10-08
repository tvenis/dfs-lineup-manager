# Development Workflow Guide

This document outlines the development workflow, Git branching strategy, and deployment process for the DFS Lineup Manager application.

## 🌿 Git Branching Strategy

### Main Branches

- **`main`** - Production-ready code, automatically deploys to Vercel
- **`develop`** - Integration branch for features, deploys to staging

### Feature Branches

- **`feature/*`** - New features (e.g., `feature/player-search`)
- **`bugfix/*`** - Bug fixes (e.g., `bugfix/lineup-validation`)
- **`hotfix/*`** - Critical production fixes

## 🚀 Development Workflow

### 1. Starting a New Feature

```bash
# Ensure you're on develop branch
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b feature/your-feature-name

# Make your changes and commit
git add .
git commit -m "feat: add player search functionality"

# Push feature branch
git push origin feature/your-feature-name
```

### 2. Creating a Pull Request

1. **Go to GitHub** and create a Pull Request
2. **Target branch**: `develop` (for features) or `main` (for hotfixes)
3. **Title format**: `feat: add player search functionality`
4. **Description**: Include what, why, and how
5. **Assign reviewers** if applicable

### 3. Code Review Process

- **Automated checks** run on every PR:
  - **Incremental Linting** (ESLint on changed files only - see [Incremental Linting Guide](./INCREMENTAL_LINTING.md))
  - Type checking (TypeScript)
  - Build verification
  - Tests (when available)

- **Manual review** required for:
  - Code quality
  - Architecture decisions
  - Security considerations

### 4. Merging and Deployment

#### Feature Branches → Develop
- **Preview deployment** created automatically
- **Manual review** required
- **Merge to develop** after approval

#### Develop → Main
- **Production deployment** to Vercel
- **Database migrations** run automatically
- **Health checks** verify deployment

## 🔄 Deployment Pipeline

### Automatic Deployments

1. **Push to `main`** → Production deployment
2. **Push to `develop`** → Staging deployment
3. **Pull Request** → Preview deployment

### Manual Deployments

```bash
# Deploy to production
vercel --prod

# Deploy to preview
vercel

# Rollback to previous version
vercel rollback
```

## 🧪 Testing Strategy

### Frontend Testing

```bash
cd web

# Run linting
npm run lint

# Run type checking
npm run type-check

# Run tests (when implemented)
npm test

# Run build verification
npm run build
```

### Backend Testing

```bash
cd backend

# Run tests
python -m pytest tests/

# Run linting
flake8 app/

# Run type checking
mypy app/
```

## 📝 Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

Examples:
feat(auth): add user authentication
fix(api): resolve player data loading issue
docs(readme): update deployment instructions
style(ui): improve button styling
refactor(store): simplify state management
test(api): add player service tests
chore(deps): update dependencies
```

### Types

- **`feat`** - New features
- **`fix`** - Bug fixes
- **`docs`** - Documentation changes
- **`style`** - Code style changes
- **`refactor`** - Code refactoring
- **`test`** - Adding or updating tests
- **`chore`** - Maintenance tasks

## 🔧 Environment Management

### Local Development

```bash
# Frontend
cd web
cp .env.example .env.local
# Edit .env.local with your local settings

# Backend
cd backend
cp .env.example .env
# Edit .env with your local settings
```

### Production

- **Vercel**: Set environment variables in dashboard
- **Railway**: Set environment variables in dashboard
- **Never commit** `.env` files to Git

## 🚨 Emergency Procedures

### Hotfix Deployment

```bash
# Create hotfix branch from main
git checkout main
git checkout -b hotfix/critical-bug

# Fix the issue
git add .
git commit -m "fix: resolve critical authentication bug"

# Push and create PR to main
git push origin hotfix/critical-bug
```

### Rollback

```bash
# Rollback to previous Vercel deployment
vercel rollback

# Rollback database (if needed)
# Contact DevOps team
```

## 📊 Monitoring and Alerts

### Vercel Monitoring

- **Performance metrics** - Core Web Vitals
- **Error tracking** - Function errors, build failures
- **Deployment status** - Success/failure notifications

### Backend Monitoring

- **Health checks** - `/health` endpoint
- **Error logging** - Structured logging with levels
- **Performance metrics** - Response times, throughput

## 🤝 Team Collaboration

### Code Review Guidelines

1. **Be constructive** - Focus on code, not person
2. **Ask questions** - If something isn't clear, ask
3. **Suggest alternatives** - Provide solutions, not just problems
4. **Respect time** - Respond to review requests promptly

### Communication Channels

- **GitHub Issues** - Bug reports, feature requests
- **Pull Requests** - Code review discussions
- **Slack/Discord** - Real-time communication
- **Email** - Formal announcements

## 📚 Resources

- [Git Flow](https://nvie.com/posts/a-successful-git-branching-model/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Vercel Documentation](https://vercel.com/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Next.js Documentation](https://nextjs.org/docs)
