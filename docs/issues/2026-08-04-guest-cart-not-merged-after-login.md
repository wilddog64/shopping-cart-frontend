# Guest cart is not merged after login

## Symptom

An item added before authentication appears in Safari but not in Chrome after
logging into the same frontend account. The browsers use the same public URL.

## Root cause

The basket service creates anonymous carts under a signed `guest-*` token and
exposes that token in `X-Cart-Token`. The frontend did not retain the token or
call `POST /api/v1/cart/merge` after authentication. Its persisted item-count
badge therefore made a guest cart look like an account cart in the original
browser, while a new browser correctly loaded the empty authenticated cart.

## Fix

Retain the response guest token, send it on anonymous cart requests, and merge
it once when the authenticated cart is first loaded. Remove the token after a
successful merge so subsequent browsers see the account-owned cart.

## Verification

The frontend service now exposes the merge operation and `useCart` performs the
merge before loading the authenticated cart whenever a guest token is present.
