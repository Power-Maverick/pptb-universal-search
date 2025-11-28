# Universal Search - Unit Testing Infrastructure

## Overview

This document describes the comprehensive unit testing infrastructure established for the Power Platform ToolBox (PPTB) Universal Search project. The testing framework ensures code quality, reliability, and maintainability as the project grows.

## Testing Framework

### Core Technologies
- **Vitest** (v2.1.0) - Fast unit test runner with TypeScript support
- **React Testing Library** (v14.1.2) - Component testing utilities
- **Jest DOM** (v6.4.2) - Additional DOM matchers
- **jsdom** (v25.0.1) - Browser environment simulation

### Test Configuration

**vitest.config.ts**
```typescript
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      reporter: ['text', 'html', 'lcov'],
      exclude: ['node_modules/', 'src/test/']
    }
  }
});
```

## Test Structure

### Service Layer Tests
- **MetadataCache.test.ts** - Entity metadata and picklist caching functionality
- **UniversalSearchService.test.ts** - Search engine, FetchXML generation, picklist options

### Component Tests  
- **SearchControlsPanel.test.tsx** - Search modes, options, user interactions
- **SearchResults.test.tsx** - Result display, tabs, table formatting
- **App.test.tsx** - Integration tests, layout, error handling

### Type Safety Tests
- **search.test.ts** - TypeScript interfaces, type guards, data structures

## Mock Strategy

### Global Mocks (setup.ts)
```typescript
// Dataverse API Mock
const mockDataverseAPI = {
  getEntityMetadata: vi.fn(),
  fetchXmlQuery: vi.fn(),
  queryData: vi.fn(),
  openRecord: vi.fn(),
  // ... additional API methods
};

// Toolbox API Mock  
const mockToolboxAPI = {
  connections: [],
  events: { on: vi.fn(), off: vi.fn() }
};
```

### Component-Specific Mocks
- **UniversalSearchService** - Mocked in App tests for search functionality
- **Window APIs** - window.open for external links
- **Console methods** - Spied for error handling verification

## Test Categories

### 1. Unit Tests
- **Purpose**: Test individual functions and components in isolation
- **Coverage**: Services, utilities, pure functions
- **Examples**: Wildcard regex conversion, XML escaping, cache operations

### 2. Component Tests
- **Purpose**: Test React components behavior and user interactions
- **Coverage**: Props handling, event callbacks, conditional rendering
- **Examples**: Search option toggles, mode switching, result display

### 3. Integration Tests
- **Purpose**: Test component interactions and data flow
- **Coverage**: App component with child components, service integration
- **Examples**: Search workflow, result handling, error propagation

### 4. Accessibility Tests
- **Purpose**: Ensure ARIA compliance and keyboard navigation
- **Coverage**: Screen reader compatibility, focus management
- **Examples**: Proper ARIA labels, keyboard event handling

### 5. Error Handling Tests
- **Purpose**: Validate graceful error handling and user feedback
- **Coverage**: API failures, invalid data, network errors
- **Examples**: Connection failures, malformed responses, timeout scenarios

## Test Patterns

### Arrange-Act-Assert
```typescript
it('should handle search execution', async () => {
  // Arrange
  const mockCallback = vi.fn();
  render(<Component onSearch={mockCallback} />);
  
  // Act
  fireEvent.click(screen.getByRole('button', { name: /search/i }));
  
  // Assert
  expect(mockCallback).toHaveBeenCalled();
});
```

### Mock Implementation
```typescript
beforeEach(() => {
  mockDataverseAPI.getEntityMetadata.mockResolvedValue([
    { LogicalName: 'account', DisplayName: { UserLocalizedLabel: { Label: 'Account' } } }
  ]);
});
```

### Error Simulation
```typescript
it('should handle API errors gracefully', async () => {
  const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  mockDataverseAPI.queryData.mockRejectedValue(new Error('API Error'));
  
  // Test error handling
  
  consoleSpy.mockRestore();
});
```

## Coverage Goals

### Current Coverage Areas
- ✅ **Services**: MetadataCache, UniversalSearchService core functionality
- ✅ **Components**: Basic rendering, prop handling, user interactions  
- ✅ **Types**: Interface validation, type safety verification
- ✅ **Mocking**: Comprehensive API and service mocking

### Target Coverage Metrics
- **Statements**: >90%
- **Branches**: >85%
- **Functions**: >90%
- **Lines**: >90%

## Running Tests

### Development Commands
```bash
# Run all tests
npm test

# Watch mode for development
npm run test:watch

# Coverage report
npm run test:coverage

# Run specific test file
npm test MetadataCache.test.ts
```

### CI/CD Integration
```bash
# CI mode (no watch, exit on completion)
npm test -- --run

# Coverage with threshold enforcement
npm run test:coverage -- --coverage.threshold.global.statements=90
```

## Best Practices

### Test Organization
- **Group related tests** using nested `describe` blocks
- **Clear test names** that describe the expected behavior
- **Consistent setup/teardown** with `beforeEach` and `afterEach`

### Mock Management
- **Reset mocks** between tests to prevent test interdependency
- **Mock at appropriate level** - global for APIs, local for specific behaviors
- **Verify mock calls** to ensure proper integration

### Async Testing
- **Use `waitFor`** for asynchronous operations
- **Mock promises** with resolved/rejected values
- **Test loading states** and error conditions

### Component Testing
- **Test user interactions** not implementation details
- **Use semantic queries** (getByRole, getByLabelText) over class names
- **Verify accessibility** with proper ARIA attributes

## Maintenance Guidelines

### Adding New Tests
1. **Identify test category** (unit, component, integration)
2. **Create appropriate mocks** for dependencies
3. **Follow naming conventions** (`ComponentName.test.tsx`)
4. **Include error scenarios** and edge cases

### Updating Existing Tests
1. **Maintain backward compatibility** when possible
2. **Update mocks** to reflect API changes
3. **Verify coverage** doesn't decrease
4. **Update documentation** for significant changes

### Performance Considerations
- **Mock heavy operations** to keep tests fast
- **Use minimal renders** for focused testing
- **Group related assertions** to reduce test overhead
- **Profile test execution** for slow test identification

## Future Enhancements

### Planned Additions
- **E2E Testing**: Playwright integration for full user workflows
- **Visual Testing**: Screenshot comparison for UI regression detection
- **Performance Testing**: Load testing for search operations
- **API Contract Testing**: Schema validation for external API interactions

### Monitoring and Metrics
- **Test execution time** tracking
- **Flaky test detection** and resolution
- **Coverage trend analysis** over time
- **Test maintenance overhead** assessment

This testing infrastructure provides a solid foundation for maintaining code quality and ensuring reliable functionality as the Universal Search project continues to evolve.