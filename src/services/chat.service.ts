import { pool } from '../config/database';
import { HttpError } from '../utils/http-error';

export interface ChatSummary {
  chatId: string;
  memberIds: string[];
  isGroup: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function createOrGetDirectChat(userAId: string, userBId: string): Promise<{ chatId: string }> {
  const normalizedA = userAId.toLowerCase();
  const normalizedB = userBId.toLowerCase();
  if (normalizedA === normalizedB) throw new HttpError(400, 'A direct chat requires two different users.');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const users = await client.query('SELECT id FROM users WHERE id = ANY($1::uuid[]) FOR SHARE', [[normalizedA, normalizedB]]);
    if (users.rowCount !== 2) throw new HttpError(404, 'One or both users were not found.');
    const [low, high] = [normalizedA, normalizedB].sort();
    const existing = await client.query<{ chat_id: string }>(
      'SELECT chat_id FROM direct_chat_pairs WHERE user_low = $1 AND user_high = $2', [low, high]
    );
    if (existing.rows[0]) {
      await client.query('COMMIT');
      return { chatId: existing.rows[0].chat_id };
    }
    const chat = await client.query<{ id: string }>(
      'INSERT INTO chats (created_by) VALUES ($1) RETURNING id', [normalizedA]
    );
    const chatId = chat.rows[0].id;
    await client.query(
      'INSERT INTO chat_members (chat_id, user_id) VALUES ($1, $2), ($1, $3)', [chatId, normalizedA, normalizedB]
    );
    await client.query(
      'INSERT INTO direct_chat_pairs (user_low, user_high, chat_id) VALUES ($1, $2, $3)', [low, high, chatId]
    );
    await client.query('COMMIT');
    return { chatId };
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof Error && 'code' in error && error.code === '23505') {
      const [low, high] = [normalizedA, normalizedB].sort();
      const found = await pool.query<{ chat_id: string }>(
        'SELECT chat_id FROM direct_chat_pairs WHERE user_low = $1 AND user_high = $2', [low, high]
      );
      if (found.rows[0]) return { chatId: found.rows[0].chat_id };
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function assertChatMember(chatId: string, userId: string): Promise<void> {
  const result = await pool.query('SELECT 1 FROM chat_members WHERE chat_id = $1 AND user_id = $2', [chatId, userId]);
  if (result.rowCount === 0) throw new HttpError(403, 'User is not a member of this chat.');
}

export async function listUserChats(userId: string): Promise<ChatSummary[]> {
  const user = await pool.query('SELECT 1 FROM users WHERE id = $1', [userId]);
  if (user.rowCount === 0) throw new HttpError(404, 'User not found.');
  const result = await pool.query<{
    chat_id: string; member_ids: string[]; is_group: boolean; created_at: Date; updated_at: Date;
  }>(`
    SELECT c.id AS chat_id,
           ARRAY(SELECT cm2.user_id::text FROM chat_members cm2 WHERE cm2.chat_id = c.id ORDER BY cm2.joined_at) AS member_ids,
           c.is_group, c.created_at, c.updated_at
    FROM chats c
    INNER JOIN chat_members cm ON cm.chat_id = c.id
    WHERE cm.user_id = $1
    ORDER BY c.updated_at DESC
  `, [userId]);
  return result.rows.map(row => ({
    chatId: row.chat_id, memberIds: row.member_ids, isGroup: row.is_group,
    createdAt: row.created_at.toISOString(), updatedAt: row.updated_at.toISOString()
  }));
}

export async function touchChat(chatId: string): Promise<void> {
  await pool.query('UPDATE chats SET updated_at = NOW() WHERE id = $1', [chatId]);
}
