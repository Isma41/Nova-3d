# Security Specification - Nova 3D

## Data Invariants
1. A Scene must have an `ownerId` matching the creator's UID.
2. A Scene must have a `name` (string, max 100 chars).
3. A Scene must have an `objects` array (max 1000 items).
4. `updatedAt` must be a server timestamp.
5. Users can only read, update, or delete their own scenes.

## The "Dirty Dozen" Payloads (Rejection Targets)
1. Creating a scene with a different `ownerId`.
2. Updating a scene's `ownerId`.
3. Creating a scene without being authenticated.
4. Reading another user's scene.
5. Updating another user's scene.
6. Deleting another user's scene.
7. Creating a scene with a name longer than 100 characters.
8. Injecting a massive array into `objects` (> 1000 items).
9. Providing a client-side timestamp for `updatedAt`.
10. Adding a "ghost field" like `isAdmin: true` to a scene document.
11. Reading the entire `scenes` collection without an owner filter.
12. Updating a scene with an invalid ID format.

## Test Strategy
All the above payloads should return `PERMISSION_DENIED`.
