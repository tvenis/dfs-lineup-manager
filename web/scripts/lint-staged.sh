#!/bin/bash
# Lint only staged files script
# This script runs ESLint only on files that are staged for commit
# Usage: ./scripts/lint-staged.sh [--fix] [--strict]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in the web directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: This script must be run from the web directory${NC}"
    exit 1
fi

# Parse arguments
FIX_FLAG=""
STRICT_MODE=false

for arg in "$@"; do
    case $arg in
        --fix)
            FIX_FLAG="--fix"
            ;;
        --strict)
            STRICT_MODE=true
            ;;
        *)
            echo -e "${YELLOW}Unknown option: $arg${NC}"
            ;;
    esac
done

# Get list of staged files (both added and modified)
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACMR | grep -E '\.(js|jsx|ts|tsx)$' | grep '^web/' | sed 's|^web/||' || true)

if [ -z "$STAGED_FILES" ]; then
    echo -e "${GREEN}✅ No staged TypeScript/JavaScript files to lint${NC}"
    exit 0
fi

echo -e "${BLUE}🔍 Linting staged files...${NC}"
echo -e "${BLUE}Files to lint:${NC}"
echo "$STAGED_FILES" | sed 's/^/  /'

# Run ESLint on staged files
if [ -n "$FIX_FLAG" ]; then
    echo -e "${YELLOW}🔧 Running ESLint with --fix on staged files...${NC}"
    echo "$STAGED_FILES" | xargs npx eslint $FIX_FLAG
    ESLINT_EXIT_CODE=$?
else
    echo -e "${BLUE}🔍 Running ESLint check on staged files...${NC}"
    ESLINT_OUTPUT=$(echo "$STAGED_FILES" | xargs npx eslint 2>&1)
    ESLINT_EXIT_CODE=$?
    
    # Check if there are any warnings or errors in output
    if echo "$ESLINT_OUTPUT" | grep -q "warning\|error"; then
        echo "$ESLINT_OUTPUT"
        if [ "$STRICT_MODE" = true ]; then
            ESLINT_EXIT_CODE=1  # Treat warnings as errors in strict mode
        fi
    else
        echo "$ESLINT_OUTPUT"
    fi
fi

if [ $ESLINT_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ All staged files pass linting!${NC}"
    exit 0
else
    echo -e "${RED}❌ Linting failed on staged files${NC}"
    
    if [ "$STRICT_MODE" = true ]; then
        echo -e "${RED}🚫 Strict mode enabled - commit blocked${NC}"
        echo -e "${YELLOW}💡 Tip: Run './scripts/lint-staged.sh --fix' to automatically fix some issues${NC}"
        echo -e "${YELLOW}💡 Or fix the issues manually and try again${NC}"
        exit 1
    else
        echo -e "${YELLOW}⚠️  Warnings found but not blocking commit (strict mode disabled)${NC}"
        echo -e "${YELLOW}💡 Tip: Run './scripts/lint-staged.sh --fix' to automatically fix some issues${NC}"
        exit 0
    fi
fi
