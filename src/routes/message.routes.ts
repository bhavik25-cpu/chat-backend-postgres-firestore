import { Router } from 'express';
import { lastSeen, list, markRead, send } from '../controllers/message.controller';
export const messageRouter = Router();
messageRouter.post('/chat/:chatId/message/send', send);
messageRouter.get('/chat/:chatId/messages', list);
messageRouter.post('/chat/:chatId/message/:messageId/read', markRead);
messageRouter.post('/chat/:chatId/lastseen', lastSeen);
