# Chat Backend — Node.js, TypeScript, PostgreSQL & Firebase Firestore

A REST API for 1:1 chat. PostgreSQL stores users, chats and chat membership. Firestore stores messages, read receipts and per-user last-seen pointers.

## Architecture
- PostgreSQL: users, chats, chat_members and direct_chat_pairs.
- Firestore: chats/{chatId}/messages/{messageId} and chats/{chatId}/lastSeen/{userId}.
- Express + TypeScript: strict typing, Zod validation, centralized errors, Helmet, CORS and rate limiting.
- Canonical sorted user pairs and a unique constraint prevent duplicate direct chats.

## Requirements
- Node.js 20+
- Docker or PostgreSQL 14+
- Firebase project with Firestore enabled and a service account

## Setup
```bash
npm install
cp .env.example .env
docker compose up -d
```

Apply schema:
```bash
psql "postgresql://postgres:postgres@localhost:5432/chat_app" -f sql/schema.sql
```

Configure Firebase with either FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in .env. Never commit credentials or .env.

```bash
npm run dev
npm run typecheck
npm run build
npm start
```

Health check: GET http://localhost:3000/health

## Create users
Registration is outside the assignment scope. Seed users directly:
```sql
INSERT INTO users (name, email) VALUES
 ('Aarav', 'aarav@example.com'),
 ('Mira', 'mira@example.com')
RETURNING id, name, email;
```

## API
All request bodies use JSON. UUID values must be valid UUID strings.

### Create/get direct chat
POST /chat/create
```json
{ "userAId": "USER_A_UUID", "userBId": "USER_B_UUID" }
```
Response: `{ "success": true, "data": { "chatId": "CHAT_UUID" } }`

### Send message
POST /chat/:chatId/message/send
```json
{ "senderId": "USER_A_UUID", "text": "Hello!" }
```
Returns message id, chatId, senderId, text, createdAt and readBy.

### Get messages
GET /chat/:chatId/messages?userId=USER_A_UUID&limit=50
Optional cursor: `&before=FIRESTORE_MESSAGE_ID`. Pages are returned oldest-to-newest; limit is 1–100.

### Mark read
POST /chat/:chatId/message/:messageId/read
```json
{ "userId": "USER_B_UUID" }
```
Adds the user to readBy using Firestore arrayUnion.

### Update last seen
POST /chat/:chatId/lastseen
```json
{ "userId": "USER_B_UUID", "messageId": "FIRESTORE_MESSAGE_ID" }
```
Stores a per-user last-seen pointer and prevents moving it to an older message.

### List chats
GET /user/:userId/chats

Returns relational chat records ordered by most recently updated, including member IDs.

## Important production notes
- Authenticate callers using Firebase Auth/JWT and derive user identity from the verified token; do not trust client-supplied IDs.
- Membership checks are performed for chat/message operations.
- Firestore Admin SDK bypasses Firestore Security Rules; protect the API and service-account credentials.
- Consider an outbox/retry strategy for cross-database consistency between PostgreSQL and Firestore.
- Run integration tests using isolated PostgreSQL and Firebase Emulator environments before production.

## Endpoints
| Method | Endpoint |
|---|---|
| POST | /chat/create |
| POST | /chat/:chatId/message/send |
| GET | /chat/:chatId/messages |
| POST | /chat/:chatId/message/:messageId/read |
| POST | /chat/:chatId/lastseen |
| GET | /user/:userId/chats |
| GET | /health |
