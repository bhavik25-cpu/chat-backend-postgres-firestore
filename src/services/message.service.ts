import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { firestore } from '../config/firebase';
import { assertChatMember, touchChat } from './chat.service';
import { HttpError } from '../utils/http-error';

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  createdAt: string;
  readBy: string[];
}

const messagesRef = (chatId: string) => firestore.collection('chats').doc(chatId).collection('messages');

export async function sendMessage(chatId: string, senderId: string, text: string): Promise<ChatMessage> {
  await assertChatMember(chatId, senderId);
  const now = Timestamp.now();
  const doc = await messagesRef(chatId).add({
    chatId, senderId, text, createdAt: now,
    readBy: [senderId], updatedAt: now
  });
  await touchChat(chatId);
  return { id: doc.id, chatId, senderId, text, createdAt: now.toDate().toISOString(), readBy: [senderId] };
}

export async function getMessages(chatId: string, userId: string, limit: number, before?: string): Promise<ChatMessage[]> {
  await assertChatMember(chatId, userId);
  let query = messagesRef(chatId).orderBy('createdAt', 'desc').orderBy('__name__', 'desc').limit(limit);
  if (before) {
    const cursor = await messagesRef(chatId).doc(before).get();
    if (!cursor.exists) throw new HttpError(404, 'Pagination cursor message not found.');
    query = query.startAfter(cursor);
  }
  const snapshot = await query.get();
  return snapshot.docs.map(doc => {
    const data = doc.data();
    const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date(data.createdAt).toISOString();
    return {
      id: doc.id, chatId, senderId: String(data.senderId), text: String(data.text),
      createdAt, readBy: Array.isArray(data.readBy) ? data.readBy.map(String) : []
    };
  }).reverse();
}

export async function markMessageRead(chatId: string, messageId: string, userId: string): Promise<void> {
  await assertChatMember(chatId, userId);
  const ref = messagesRef(chatId).doc(messageId);
  await firestore.runTransaction(async transaction => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) throw new HttpError(404, 'Message not found.');
    transaction.update(ref, { readBy: FieldValue.arrayUnion(userId), updatedAt: Timestamp.now() });
  });
}

export async function updateLastSeen(chatId: string, userId: string, messageId: string): Promise<void> {
  await assertChatMember(chatId, userId);
  const message = await messagesRef(chatId).doc(messageId).get();
  if (!message.exists) throw new HttpError(404, 'Message not found.');
  const messageData = message.data();
  const seenRef = firestore.collection('chats').doc(chatId).collection('lastSeen').doc(userId);
  await firestore.runTransaction(async transaction => {
    const current = await transaction.get(seenRef);
    const currentTime = current.exists ? (current.data()?.messageCreatedAt as Timestamp | undefined) : undefined;
    const nextTime = messageData?.createdAt as Timestamp;
    if (currentTime && currentTime.toMillis() > nextTime.toMillis()) return;
    transaction.set(seenRef, {
      userId, messageId, messageCreatedAt: nextTime,
      updatedAt: Timestamp.now()
    }, { merge: true });
  });
}

export async function getLastSeen(chatId: string, userId: string): Promise<{ userId: string; messageId: string; updatedAt: string } | null> {
  await assertChatMember(chatId, userId);
  const snapshot = await firestore.collection('chats').doc(chatId).collection('lastSeen').doc(userId).get();
  if (!snapshot.exists) return null;
  const data = snapshot.data();
  return {
    userId, messageId: String(data?.messageId),
    updatedAt: (data?.updatedAt as Timestamp).toDate().toISOString()
  };
}
