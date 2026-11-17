import type { Request, Response } from 'express';
import { z } from 'zod';
import { createOrGetDirectChat, listUserChats } from '../services/chat.service';
import { asyncHandler } from '../utils/async-handler';

const createChatSchema = z.object({ userAId: z.string().uuid(), userBId: z.string().uuid() });
const userIdSchema = z.string().uuid();

export const createChat = asyncHandler(async (req: Request, res: Response) => {
  const body = createChatSchema.parse(req.body);
  const result = await createOrGetDirectChat(body.userAId, body.userBId);
  res.status(200).json({ success: true, data: result });
});

export const getUserChats = asyncHandler(async (req: Request, res: Response) => {
  const userId = userIdSchema.parse(req.params.userId);
  const chats = await listUserChats(userId);
  res.status(200).json({ success: true, data: chats });
});
