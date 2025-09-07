import { Router } from "express";
import { z } from "zod";
import jwt from "jsonwebtoken";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";
import { listActiveUsers } from "../services/presenceGlobal.js";
import { eq } from "drizzle-orm";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
const loginSchema = z.object({ username: z.string().min(2).max(64) });

router.post("/login", async (req, res) => {
  const parse = loginSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: "Invalid username" });
  }
  const { username } = parse.data;

  // Ensure unique by upserting or returning existing
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.username, username));
  let userId: number | undefined;
  if (existing.length > 0) {
    userId = existing[0]?.id;
  } else {
    const inserted = await db
      .insert(users)
      .values({ username })
      .returning({ id: users.id });
    userId = inserted[0]?.id;
  }

  // Generate JWT token
  const token = jwt.sign({ id: userId!, username }, JWT_SECRET, { expiresIn: '30d' });
  
  // Set httpOnly cookie
  res.cookie('auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  });

  return res.json({ id: userId!, username, token });
});

// Verify token endpoint
router.get('/verify', async (req, res) => {
  const token = req.cookies['auth-token'] || req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; username: string };
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, decoded.id))
      .limit(1);

    if (user.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.json({ id: user[0]!.id, username: user[0]!.username });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  res.clearCookie('auth-token');
  res.json({ message: 'Logged out successfully' });
});

export default router;
