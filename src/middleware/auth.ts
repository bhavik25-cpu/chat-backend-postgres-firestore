import type { Request, Response, NextFunction } from 'express';
import { admin } from '../config/firebase';
import { pool } from '../config/database';

export async function requireFirebaseAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.header('authorization');
  const match = header?.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    res.status(401).json({ success: false, message: 'A valid Bearer Firebase ID token is required.' });
    return;
  }

  try {
    const decoded = await admin.auth().verifyIdToken(match[1]);
    const result = await pool.query<{ id: string }>(
      'SELECT id FROM users WHERE firebase_uid = $1',
      [decoded.uid]
    );
    if (!result.rows[0]) {
      res.status(403).json({ success: false, message: 'This Firebase account is not linked to an application user.' });
      return;
    }
    req.authUserId = result.rows[0].id;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired Firebase ID token.' });
  }
}
