/**
 * Flow #5: Token Rotation and Reuse Detection
 *
 * Validates the security mechanism where refresh tokens are single-use.
 * If a stale (already-rotated) token is reused, the entire token family
 * is invalidated, forcing a full logout.
 *
 * Steps:
 * 1. Sign in → obtain refresh_token_v1
 * 2. Rotate (valid) → obtain refresh_token_v2, assert 200
 * 3. Reuse stale refresh_token_v1 → assert 401
 * 4. Use access token from step 2 → assert 401 (forced logout)
 *
 * Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5
 */

import { test, expect } from '../../fixtures';
import type { APIResponse } from '@playwright/test';

const API_BASE = 'http://localhost:3001';

/**
 * Extracts the refresh_token value from the set-cookie response header.
 *
 * Parses headers like:
 *   refresh_token=<value>; Path=/; HttpOnly; ...
 *
 * Preconditions: response has a set-cookie header containing refresh_token
 * Postconditions: returns a non-empty refresh token string
 */
function extractRefreshToken(response: APIResponse): string {
  const setCookieHeader = response.headers()['set-cookie'];
  if (!setCookieHeader) {
    throw new Error('No set-cookie header found in response');
  }

  // set-cookie may contain multiple cookies separated by newlines or commas
  // Look for the refresh_token cookie
  const cookies = setCookieHeader.split(/[,\n]/).map((c) => c.trim());
  for (const cookie of cookies) {
    const match = /^refresh_token=([^;]+)/.exec(cookie);
    if (match?.[1]) {
      return match[1];
    }
  }

  throw new Error(`refresh_token not found in set-cookie header: ${setCookieHeader}`);
}

/**
 * Extracts the access token from the JSON response body.
 */
async function extractAccessToken(response: APIResponse): Promise<string> {
  const body = await response.json();
  if (!body.accessToken) {
    throw new Error(`accessToken not found in response body: ${JSON.stringify(body)}`);
  }
  return body.accessToken as string;
}

test.describe('Flow #5: Token Rotation & Reuse Detection', () => {
  test('rotating a refresh token invalidates the old one and reuse triggers forced logout', async ({
    anonRequest,
  }) => {
    // Create a fresh user for this test to avoid conflicts
    const timestamp = Date.now();
    const email = `e2e-rotation-${timestamp}@test.com`;
    const password = 'TestPass123!';
    const name = 'Token Rotation User';

    // Sign up the user
    const signUpResponse = await anonRequest.post(`${API_BASE}/api/auth/sign-up`, {
      data: { email, password, name },
    });
    expect(signUpResponse.status()).toBe(201);

    // Step 1: Sign in and obtain refresh_token_v1
    const signInResponse = await anonRequest.post(`${API_BASE}/api/auth/sign-in`, {
      data: { email, password },
    });
    expect(signInResponse.status()).toBe(201);
    const refreshToken_v1 = extractRefreshToken(signInResponse);
    expect(refreshToken_v1).toBeTruthy();

    // Step 2: Rotate token (valid use) — POST /api/auth/refresh with refresh_token_v1
    const refresh1Response = await anonRequest.post(`${API_BASE}/api/auth/refresh`, {
      headers: { Cookie: `refresh_token=${refreshToken_v1}` },
    });
    expect(refresh1Response.status()).toBe(200);

    const refreshToken_v2 = extractRefreshToken(refresh1Response);
    expect(refreshToken_v2).toBeTruthy();
    expect(refreshToken_v2).not.toBe(refreshToken_v1);

    // Extract the access token from the rotation response (for step 4)
    const accessTokenFromRotation = await extractAccessToken(refresh1Response);
    expect(accessTokenFromRotation).toBeTruthy();

    // Step 3: Attempt reuse of stale token (attack simulation)
    // refresh_token_v1 has already been rotated, so reusing it should trigger reuse detection
    const reuseResponse = await anonRequest.post(`${API_BASE}/api/auth/refresh`, {
      headers: { Cookie: `refresh_token=${refreshToken_v1}` },
    });
    expect(reuseResponse.status()).toBe(401);

    // Step 4: Verify forced logout — even the access token from step 2 is now invalid
    // The entire token family was revoked when reuse was detected
    const meResponse = await anonRequest.get(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${accessTokenFromRotation}` },
    });
    expect(meResponse.status()).toBe(401);
  });
});
