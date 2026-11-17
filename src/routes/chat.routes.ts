import { Router } from 'express';
import { createChat, getUserChats } from '../controllers/chat.controller';
export const chatRouter = Router();
chatRouter.post('/chat/create', createChat);
chatRouter.get('/user/:userId/chats', getUserChats);
