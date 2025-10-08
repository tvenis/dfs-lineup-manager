# Player Profile Tests

This directory contains tests for the Player Profile functionality, designed to validate the system before and after SSR migration.

## Current Test Structure

### Basic Setup Tests (`simple.test.ts`)
Tests basic Jest setup and functionality:
- ✅ Basic test execution
- ✅ Async operations
- ✅ Fetch mocking

### API Integration Tests (`playerService.test.ts`)
Tests the core API integration functionality:
- ✅ Basic API calls with fetch
- ✅ Error handling (404s, 500s, network errors)
- ✅ Response parsing (malformed JSON)
- ✅ Edge cases (invalid IDs, large numbers)
- ✅ URL construction and encoding
- ✅ Timeout and connection errors

## Test Coverage Goals

- **API Integration**: Core fetch functionality and error handling
- **Error Scenarios**: HTTP status codes, network errors, parsing errors
- **Edge Cases**: Invalid inputs, boundary conditions
- **URL Construction**: Proper parameter encoding and URL building

## Running Tests

### Quick Test Run
```bash
cd web
npm test
```

### Watch Mode (for development)
```bash
cd web
npm run test:watch
```

### Coverage Report
```bash
cd web
npm run test:coverage
```

### Using Scripts
```bash
# Run all tests
./web/scripts/run-tests.sh

# Run tests with coverage
./web/scripts/run-tests.sh --coverage

# Run tests in watch mode
./web/scripts/run-tests.sh --watch

# Run tests as part of type checking
./scripts/check-types.sh --test
```

## Test Coverage Goals

- **API Integration**: 100% of critical paths
- **Component Rendering**: 90% of user interactions
- **Error Handling**: 95% of error scenarios
- **Edge Cases**: 80% of boundary conditions

## Pre-Migration Validation

Before making SSR changes, ensure all tests pass:

```bash
# Run full test suite
npm test

# Check coverage meets thresholds
npm run test:coverage
```

## Post-Migration Validation

After SSR implementation, re-run tests to ensure:
1. All existing functionality still works
2. New server-side rendering doesn't break client-side features
3. Error handling still works correctly
4. Performance hasn't regressed

## Test Data

Tests use mock data that represents realistic player information:
- Player IDs: 11370, 11371, etc.
- Teams: TEST, REAL, etc.
- Positions: QB, RB, WR, TE, DST
- Statuses: Available, Questionable, Out, etc.

## Mocking Strategy

- **API Calls**: Mocked at the service level
- **Next.js Router**: Mocked for navigation testing
- **Fetch**: Global fetch mock for API testing
- **Child Components**: Minimal mocking for isolation

## Debugging Tests

If tests fail:
1. Check console output for detailed error messages
2. Use `--verbose` flag for more detailed output
3. Run individual test files: `npm test playerService.test.ts`
4. Use `--no-coverage` for faster debugging

## Adding New Tests

When adding new functionality:
1. Add API tests first (service layer)
2. Add component tests (UI layer)
3. Add error handling tests
4. Update this README with new test descriptions

## Best Practices

- Keep tests focused and isolated
- Use descriptive test names
- Mock external dependencies
- Test both success and failure scenarios
- Maintain high test coverage
- Keep tests fast and reliable
