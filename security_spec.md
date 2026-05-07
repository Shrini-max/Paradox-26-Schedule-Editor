# Paradox '26 Security Specification

## 1. Data Invariants
- Events must have a name, day, time, category, and venue.
- Events must have a valid non-empty ID.
- Venues and Categories are identified by their names as document IDs.

## 2. The "Dirty Dozen" Payloads
1. Create an event without a name.
2. Create an event with a name exceeding 200 characters.
3. Update an event's `createdAt` timestamp.
4. Delete an event as an unauthenticated user.
5. Create an event with a malicious ID (e.g. `../test`).
6. Update a venue name to something malicious.
7. Inject a huge description (DOW attack).
8. List events without being signed in.
9. Create an event with an invalid category (not a string).
10. Update an event with a "ghost field" (e.g. `isAdmin: true`).
11. Create a venue without an authenticated session.
12. Update an event's ID in the document body.

## 3. Test Runner (Draft)
```typescript
// firestore.rules.test.ts logic
// - Verify unauth read is denied.
// - Verify auth read is allowed.
// - Verify auth write with valid data is allowed.
// - Verify auth write with missing required fields is denied.
// - Verify immutable fields.
```
