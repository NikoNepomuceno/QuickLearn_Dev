# Backend Testing Documentation

## Overview

This backend now has a comprehensive testing framework using **Jest** and **Supertest** for unit and integration testing. The tests focus on error handling, production issues, and API response consistency.

## Quick Start

```bash
# Install dependencies (if not already done)
npm install

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test quizRoutes.test.js
```

## Test Coverage

### Current Test Files

1. **`__tests__/routes/quizRoutes.test.js`**
   - Tests for GET /api/quiz (get user quizzes)
   - Tests for GET /api/quiz/:uuid (get specific quiz)
   - Tests for POST /api/quiz/from-file (create quiz)
   - Error handling scenarios
   - Query parameter validation

2. **`__tests__/services/cloudStorageService.test.js`**
   - Tests for getUserQuizzes service method
   - Tests for getQuizByUuid service method
   - Tests for createQuizWithFile service method
   - Database error handling
   - File upload error handling

3. **`__tests__/middleware/auth.test.js`**
   - Tests for authenticateToken middleware
   - Tests for optionalAuth middleware
   - Token validation
   - Error responses

4. **`__tests__/api/errorHandling.test.js`**
   - Integration tests for error response formats
   - Error logging verification
   - Success response format validation
   - Edge case handling

## Test Structure

```
__tests__/
├── setup.js                    # Test environment configuration
├── helpers/
│   ├── mockDb.js              # Database mocking utilities
│   └── mockAuth.js            # Authentication mocking utilities
├── routes/
│   └── quizRoutes.test.js     # Route tests
├── services/
│   └── cloudStorageService.test.js  # Service tests
├── middleware/
│   └── auth.test.js           # Middleware tests
└── api/
    └── errorHandling.test.js  # Integration tests
```

## Key Testing Patterns

### 1. Error Handling Tests

All tests verify that errors are:
- Properly caught
- Returned with correct HTTP status codes
- Include error messages in consistent format
- Logged for debugging

Example:
```javascript
it('should return 500 with proper error message when database fails', async () => {
  CloudStorageService.getUserQuizzes.mockRejectedValue(
    new Error('Database connection failed')
  );

  const response = await request(app)
    .get('/api/quiz')
    .set('Authorization', 'Bearer test-token');

  expect(response.status).toBe(500);
  expect(response.body).toHaveProperty('error');
  expect(response.body.error).toBe('Failed to get quizzes');
});
```

### 2. Success Response Tests

Tests verify that successful responses:
- Have correct structure
- Include all required fields
- Match expected data types

Example:
```javascript
it('should return quizzes successfully with proper structure', async () => {
  const mockQuizzes = [
    { id: 'quiz-1', title: 'Test Quiz', summary: { attemptsCount: 0 } }
  ];

  CloudStorageService.getUserQuizzes.mockResolvedValue(mockQuizzes);

  const response = await request(app)
    .get('/api/quiz')
    .set('Authorization', 'Bearer test-token');

  expect(response.status).toBe(200);
  expect(response.body).toHaveProperty('quizzes');
  expect(response.body).toHaveProperty('pagination');
});
```

### 3. Edge Case Tests

Tests cover:
- Empty results
- Invalid input parameters
- Boundary conditions
- Missing data

## Mocking Strategy

### Service Mocking
Services are mocked at the module level:
```javascript
jest.mock('../../src/services/cloudStorageService');
const CloudStorageService = require('../../src/services/cloudStorageService');
```

### Database Mocking
Database operations are mocked using helper utilities:
```javascript
const { mockDbQuery, mockDbError } = require('../helpers/mockDb');
```

### Authentication Mocking
Authentication middleware is bypassed in tests:
```javascript
jest.mock('../../src/middleware/auth', () => ({
  authenticateToken: (req, res, next) => next(),
  optionalAuth: (req, res, next) => next()
}));
```

## Production Issues Covered

These tests specifically address the production issues we fixed:

1. **Silent Error Swallowing**
   - Tests verify errors are properly returned to clients
   - Tests check error messages are included in responses

2. **Network/CORS Errors**
   - Tests verify proper error handling for connection failures
   - Tests check error messages are user-friendly

3. **API Response Consistency**
   - Tests verify all endpoints return consistent error formats
   - Tests check success responses have expected structure

4. **Query Parameter Validation**
   - Tests verify limit/offset are properly validated
   - Tests check edge cases (negative values, large numbers)

## Running Tests in CI/CD

Add to your CI/CD pipeline:

```yaml
# Example GitHub Actions
- name: Run tests
  run: |
    cd QuickLearn-Backend
    npm test
```

## Coverage Goals

- **Critical Services**: 80%+ coverage
- **API Routes**: 70%+ coverage  
- **Error Handling**: 100% coverage

View coverage report:
```bash
npm test -- --coverage
```

## Adding New Tests

When adding new features:

1. **Write tests first** (TDD approach)
2. **Test error cases** - don't just test happy paths
3. **Test edge cases** - boundary conditions, invalid input
4. **Verify error messages** - ensure they're helpful and consistent
5. **Test response formats** - ensure consistency with existing APIs

## Troubleshooting

### Tests failing with "Cannot find module"
- Ensure all dependencies are installed: `npm install`
- Check that mocks are set up before requiring modules

### Database connection errors
- Tests use mocked database - no real DB connection needed
- Check that `mockDb.js` helpers are being used correctly

### Authentication errors
- Authentication is mocked in tests
- Ensure `req.user` is set in test setup if needed

## Next Steps

1. Add tests for other routes (authRoutes, userRoutes, etc.)
2. Add tests for other services (quizService, authService, etc.)
3. Add integration tests for complete user flows
4. Set up coverage reporting in CI/CD
5. Add performance/load tests for critical endpoints

