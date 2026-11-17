# Chat Backend — Node.js, TypeScript, PostgreSQL & Firebase Firestore

A REST API for 1:1 chat. PostgreSQL stores users, chats and membership. Firestore stores messages, read receipts and last-seen pointers.

## Architecture
- PostgreSQL: users, chats, chat_members and direct_chat_pairs.
- Firebase Authentication: verifies caller identity using Firebase ID tokens.
- Firestore: chats/{chatId}/messages/{messageId} and chats/{chatId}/lastSeen/{userId}.
- Express + TypeScript: Zod validation, centralized errors, Helmet, CORS and rate limiting.
- Canonical sorted user pairs and a unique constraint prevent duplicate direct chats.

## Requirements
- Node.js 20+
- Docker or PostgreSQL 14+
- Firebase project with Authentication (Google or email/password provider) and Firestore enabled
- Firebase Admin service account credentials

## Setup
```bash
npm install
cp .env.example .env
docker compose up -d
```

Apply the schema:
```bash
psql "postgresql://postgres:postgres@localhost:5432/chat_app" -f sql/schema.sql
```

Configure Firebase credentials using either `FIREBASE_SERVICE_ACCOUNT_PATH` or `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY` in `.env`. Never commit credentials or `.env`.

## Link Firebase users to application users

The API requires a Firebase ID token and maps its verified Firebase UID to `users.firebase_uid`. Create the Firebase Auth user first, then provision the application user and UID through a trusted administrative process:

```sql
INSERT INTO users (name, email, firebase_uid)
VALUES ('Aarav', 'aarav@example.com', 'FIREBASE_AUTH_UID')
RETURNING id, name, email, firebase_uid;
```

Do not expose an endpoint that lets an unauthenticated caller choose another user's Firebase UID. The UID above is obtained from the Firebase Admin console or a trusted account-provisioning workflow.

## Run
```bash
npm run dev
npm run typecheck
npm run build
npm test
npm start
```

Health check (public): `GET http://localhost:3000/health`.

## Authentication

All routes except `GET /health` require:
```
Authorization: Bearer FIREBASE_ID_TOKEN
Content-Type: application/json
```
Obtain the ID token from the Firebase client SDK after sign-in. The server verifies it with Firebase Admin and resolves the Firebase UID to the corresponding application user. The API rejects missing/invalid tokens and prevents callers from submitting another user's ID.

## API

All IDs for PostgreSQL users/chats are UUIDs. Firestore message IDs are document IDs.

### Create/get direct chat
`POST /chat/create`
```json
{ "userAId": "AUTHENTICATED_USER_UUID", "userBId": "OTHER_USER_UUID" }
```
The authenticated user must be one of the two participants.

### Send message
`POST /chat/:chatId/message/send`
```json
{ "senderId": "AUTHENTICATED_USER_UUID", "text": "Hello!" }
```
Returns message id, chatId, senderId, text, createdAt and readBy.

### Get messages
`GET /chat/:chatId/messages?limit=50`
Optional cursor: `&before=FIRESTORE_MESSAGE_ID`. Caller identity is taken from the verified token. Pages are returned oldest-to-newest; limit is 1–100.

### Mark read
`POST /chat/:chatId/message/:messageId/read`
```json
{ "userId": "AUTHENTICATED_USER_UUID" }
```
Adds the authenticated user to readBy using Firestore arrayUnion.

### Update last seen
`POST /chat/:chatId/lastseen`
```json
{ "userId": "AUTHENTICATED_USER_UUID", "messageId": "FIRESTORE_MESSAGE_ID" }
```
Stores a per-user last-seen pointer. It never moves backwards; equal timestamps use a stable document-ID tie-breaker.

### List chats
`GET /user/:userId/chats`
The requested user ID must match the authenticated user.

## Data consistency and operational notes
- Firestore is the source of truth for message writes. If updating PostgreSQL's chat activity timestamp fails after a successful Firestore write, the API still reports the durable message as sent to avoid creating duplicates on client retry. A production deployment should add an outbox/reconciliation worker.
- Firestore Admin SDK bypasses Firestore Security Rules; protect this API and service-account credentials.
- Use HTTPS, restrict CORS origins, rotate service-account keys, and provision Firebase UID mappings only through a trusted process.
- Database schema includes a migration-safe `firebase_uid` column and unique index.

## Tests
`npm test` runs deterministic unit tests for last-seen monotonic ordering. CI also runs dependency installation, type-checking, build and unit tests. PostgreSQL/Firestore integration tests still require configured test services or Firebase Emulator and are not represented as passing by the unit suite.

## Endpoints
| Method | Endpoint |
|---|---|
| GET | /health |
| POST | /chat/create |
| POST | /chat/:chatId/message/send |
| GET | /chat/:chatId/messages |
| POST | /chat/:chatId/message/:messageId/read |
| POST | /chat/:chatId/lastseen |
| GET | /user/:userId/chats |
