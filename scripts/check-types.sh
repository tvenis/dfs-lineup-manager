#!/bin/bash
# TypeScript and linting check script
# Usage: ./scripts/check-types.sh [--fix]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Running TypeScript and linting checks...${NC}"

# Check if web directory exists
if [ ! -d "web" ]; then
    echo -e "${RED}❌ No web directory found!${NC}"
    exit 1
fi

cd web

# Run TypeScript type check
echo -e "${BLUE}📦 Running TypeScript type check...${NC}"
if npm run type-check; then
    echo -e "${GREEN}✅ TypeScript type check passed!${NC}"
else
    echo -e "${RED}❌ TypeScript type check failed!${NC}"
    echo -e "${YELLOW}💡 Fix the errors above and try again.${NC}"
    exit 1
fi

# Run ESLint check
echo -e "${BLUE}🔍 Running ESLint check...${NC}"
if [ "$1" = "--fix" ]; then
    echo -e "${YELLOW}🔧 Running ESLint with --fix...${NC}"
    npm run lint -- --fix
else
    if npm run lint; then
        echo -e "${GREEN}✅ ESLint check passed!${NC}"
    else
        echo -e "${RED}❌ ESLint check failed!${NC}"
        echo -e "${YELLOW}💡 Run './scripts/check-types.sh --fix' to auto-fix some issues.${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✅ All checks passed! Code is ready to commit.${NC}"
cd ..
exit 0
