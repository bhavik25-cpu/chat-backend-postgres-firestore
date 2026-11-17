import type { Request, Response } from 'express';
import { z } from 'zod';
import { createOrGetDirectChat, listUserChats } from '../services/chat.service';
import { asyncHandler } from '../utils/async-handler';
import { HttpError } from '../utils/http-error';

const createChatSchema = z.object({ userAId: z.string().uuid(), userBId: z.string().uuid() });
const userIdSchema = z.string().uuid();

export const createChat = asyncHandler(async (req: Request, res: Response) => {
  const body = createChatSchema.parse(req.body);
  const authenticatedUserId = req.authUserId!;
  if (body.userAId.toLowerCase() !== authenticatedUserId.toLowerCase() && body.userBId.toLowerCase() !== authenticatedUserId.toLowerCase()) {
    throw new HttpError(403, 'You can only create a chat that includes your account.');
  }
  const result = await createOrGetDirectChat(body.userAId, body.userBId);
  res.status(200).json({ success: true, data: result });
});

export const getUserChats = asyncHandler(async (req: Request, res: Response) => {
  const userId = userIdSchema.parse(req.params.userId);
  if (userId.toLowerCase() !== req.authUserId?.toLowerCase()) throw new HttpError(403, 'You can only view your own chats.');
  const chats = await listUserChats(userId);
  res.status(200).json({ success: true, data: chats });
});
