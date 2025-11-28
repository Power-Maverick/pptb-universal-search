// Test setup file
import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock the global window.dataverseAPI
const mockDataverseAPI = {
  getEntityMetadata: vi.fn(),
  getEntityRelatedMetadata: vi.fn(),
  getAllEntitiesMetadata: vi.fn(),
  fetchXmlQuery: vi.fn(),
  queryData: vi.fn(),
  execute: vi.fn(),
  retrieve: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  create: vi.fn(),
  getSolutions: vi.fn(),
  openRecord: vi.fn(),
  executeQuery: vi.fn(),
  retrieveRecord: vi.fn(),
  createRecord: vi.fn(),
  updateRecord: vi.fn(),
  deleteRecord: vi.fn(),
  associateRecord: vi.fn(),
  disassociateRecord: vi.fn(),
  executeAction: vi.fn(),
  executeFunction: vi.fn()
};

// Mock the global window.toolboxAPI
const mockToolboxAPI = {
  connections: [],
  events: {
    on: vi.fn(),
    off: vi.fn()
  }
};

// Setup global window objects
Object.defineProperty(window, 'dataverseAPI', {
  value: mockDataverseAPI,
  writable: true,
});

Object.defineProperty(window, 'toolboxAPI', {
  value: mockToolboxAPI,
  writable: true,
});

// Export for use in tests
export { mockDataverseAPI, mockToolboxAPI };