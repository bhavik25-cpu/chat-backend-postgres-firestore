import type { Request, Response } from 'express';
import { z } from 'zod';
import { getMessages, markMessageRead, sendMessage, updateLastSeen, getLastSeen } from '../services/message.service';
import { asyncHandler } from '../utils/async-handler';

const uuid = z.string().uuid();
const sendSchema = z.object({ senderId: uuid, text: z.string().trim().min(1).max(5000) });
const readSchema = z.object({ userId: uuid });
const lastSeenSchema = z.object({ userId: uuid, messageId: z.string().min(1) });

export const send = asyncHandler(async (req: Request, res: Response) => {
  const chatId = uuid.parse(req.params.chatId);
  const body = sendSchema.parse(req.body);
  const message = await sendMessage(chatId, body.senderId, body.text);
  res.status(201).json({ success: true, data: message });
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const chatId = uuid.parse(req.params.chatId);
  const userId = uuid.parse(req.query.userId);
  const limit = z.coerce.number().int().min(1).max(100).default(50).parse(req.query.limit);
  const before = req.query.before === undefined ? undefined : z.string().min(1).parse(req.query.before);
  const messages = await getMessages(chatId, userId, limit, before);
  res.status(200).json({ success: true, data: messages, pagination: { limit, nextCursor: messages[0]?.id ?? null } });
});

export const markRead = asyncHandler(async (req: Request, res: Response) => {
  const chatId = uuid.parse(req.params.chatId);
  const messageId = z.string().min(1).parse(req.params.messageId);
  const { userId } = readSchema.parse(req.body);
  await markMessageRead(chatId, messageId, userId);
  res.status(200).json({ success: true, message: 'Message marked as read.' });
});

export const lastSeen = asyncHandler(async (req: Request, res: Response) => {
  const chatId = uuid.parse(req.params.chatId);
  const body = lastSeenSchema.parse(req.body);
  await updateLastSeen(chatId, body.userId, body.messageId);
  res.status(200).json({ success: true, data: await getLastSeen(chatId, body.userId) });
});
