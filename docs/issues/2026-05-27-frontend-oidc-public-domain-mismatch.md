# Bug: Frontend OIDC Public Domain Mismatch (Cloudflare DNS)

**Date:** 2026-05-27
**Severity:** Medium — prevents login when accessing via public URL
**Status:** Open
**Assignee:** Gemini CLI

## Symptom
When accessing the frontend via the public Cloudflare URL (https://frontend.3ai-talk.org), clicking the login button results in a "Invalid redirect URL" error page from Keycloak.

## Root Cause Analysis
Modern browsers (and the react-oidc-context library) dynamically generate the redirect_uri based on the current origin.
1. **Current Origin:** https://frontend.3ai-talk.org
2. **Generated Redirect:** https://frontend.3ai-talk.org/callback
3. **Keycloak Client Config:** The frontend client in Keycloak is currently only configured with localhost and shopping-cart.local redirect URIs.
4. **Result:** Keycloak rejects the authentication request because the redirect URI is not whitelisted.

## Proposed Resolution
Add the public domain to the Keycloak realm configuration in the shopping-cart-infra repository.

**File:** identity/keycloak/realm-shopping-cart.json
**Target:** Client frontend

Add the following to redirectUris:
- https://frontend.3ai-talk.org/*

Add the following to webOrigins:
- https://frontend.3ai-talk.org (or keep +)

## Verification
1. Access https://frontend.3ai-talk.org.
2. Click Login.
3. Verify successful redirect to Keycloak and back to the application.
