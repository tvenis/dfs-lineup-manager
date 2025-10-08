#!/bin/bash
# Test runner script for the web application
# Usage: ./scripts/run-tests.sh [--watch] [--coverage]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Running Player Profile Tests...${NC}"

# Check if web directory exists
if [ ! -d "web" ]; then
    echo -e "${RED}❌ No web directory found!${NC}"
    exit 1
fi

cd web

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
fi

# Run tests based on arguments
if [ "$1" = "--watch" ]; then
    echo -e "${BLUE}👀 Running tests in watch mode...${NC}"
    npm run test:watch
elif [ "$1" = "--coverage" ]; then
    echo -e "${BLUE}📊 Running tests with coverage...${NC}"
    npm run test:coverage
else
    echo -e "${BLUE}🚀 Running tests...${NC}"
    npm test
fi

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
else
    echo -e "${RED}❌ Some tests failed!${NC}"
    exit 1
fi

cd ..
exit 0
