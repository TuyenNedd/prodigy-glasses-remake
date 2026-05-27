/**
 * Flow #6: Admin RBAC Enforcement
 *
 * Validates that non-admin users cannot access any admin endpoint.
 * A regular authenticated user should receive 403 Forbidden on every
 * admin-protected route, regardless of HTTP method.
 *
 * Validates: Requirements 9.1, 9.2, 9.3
 */

import { test, expect } from '../../fixtures';

const FAKE_ID = '00000000-0000-0000-0000-000000000000';

/**
 * All admin endpoints that must be protected by the RBAC guard.
 * Non-admin users must receive 403 for every one of these.
 */
const ADMIN_ENDPOINTS = [
  { method: 'GET', path: '/api/admin/orders' },
  { method: 'GET', path: '/api/admin/products' },
  { method: 'GET', path: '/api/admin/users' },
  { method: 'GET', path: '/api/admin/categories' },
  { method: 'GET', path: '/api/admin/comments' },
  { method: 'PATCH', path: '/api/admin/orders/:id/status' },
  { method: 'PUT', path: '/api/admin/products/:id' },
  { method: 'DELETE', path: '/api/admin/products/:id' },
] as const;

test.describe('Flow #6: RBAC Enforcement', () => {
  for (const endpoint of ADMIN_ENDPOINTS) {
    const resolvedPath = endpoint.path.replace(':id', FAKE_ID);

    test(`${endpoint.method} ${endpoint.path} returns 403 for non-admin user`, async ({
      userRequest,
    }) => {
      let response;

      switch (endpoint.method) {
        case 'GET':
          response = await userRequest.get(resolvedPath);
          break;
        case 'PATCH':
          response = await userRequest.patch(resolvedPath, { data: {} });
          break;
        case 'PUT':
          response = await userRequest.put(resolvedPath, { data: {} });
          break;
        case 'DELETE':
          response = await userRequest.delete(resolvedPath);
          break;
      }

      expect(response.status()).toBe(403);
    });
  }
});
