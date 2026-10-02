import { Router, Request, Response } from 'express';
import prisma from '../prisma.js';

const router = Router();

// Lookup user by email (used when email field blurs on Login page)
router.get('/user/:email', async (req: Request, res: Response) => {
  try {
    const email = req.params.email.trim().toLowerCase();
    if (email === 'admin@checkin.com') {
      return res.json({ name: 'ผู้ดูแลระบบ', role: 'admin', email, userId: 'ADMIN1449' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json(user);
  } catch (error: any) {
    console.error('Error fetching user by email:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Register new user (Student or Teacher)
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, name, userId, role, major } = req.body;
    const trimmedEmail = (email || '').trim().toLowerCase();
    const trimmedName = (name || '').trim();
    const trimmedUserId = (userId || '').trim();

    if (!trimmedEmail || !trimmedName || !trimmedUserId || !role) {
      return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    }

    const existing = await prisma.user.findUnique({
      where: { email: trimmedEmail },
    });

    if (existing) {
      return res.status(400).json({ error: 'อีเมลนี้เคยลงทะเบียนไว้ในระบบแล้ว' });
    }

    const newUser = await prisma.user.create({
      data: {
        email: trimmedEmail,
        name: trimmedName,
        userId: trimmedUserId,
        role,
        major: major ? major.trim() : role === 'student' ? 'วิศวกรรมคอมพิวเตอร์' : 'อาจารย์ผู้สอน',
      },
    });

    return res.status(201).json(newUser);
  } catch (error: any) {
    console.error('Error in /register:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, userId } = req.body;
    const trimmedEmail = (email || '').trim().toLowerCase();
    const trimmedUserId = (userId || '').trim();

    // Admin login
    if (trimmedEmail === 'admin@checkin.com') {
      if (trimmedUserId === 'ADMIN1449') {
        return res.json({
          email: 'admin@checkin.com',
          name: 'ผู้ดูแลระบบ',
          role: 'admin',
          userId: 'ADMIN1449',
        });
      } else {
        return res.status(401).json({ error: 'รหัสประจำตัวแอดมินไม่ถูกต้อง!' });
      }
    }

    const user = await prisma.user.findUnique({
      where: { email: trimmedEmail },
    });

    if (!user) {
      return res.status(404).json({ error: 'ไม่พบอีเมลนี้ในระบบ! โปรดตรวจสอบให้แน่ใจว่าลงทะเบียนแล้ว' });
    }

    if (user.userId !== trimmedUserId) {
      return res.status(401).json({ error: 'รหัสประจำตัวไม่ถูกต้อง!' });
    }

    return res.json(user);
  } catch (error: any) {
    console.error('Error in /login:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Get all users (for Admin dashboard)
router.get('/users', async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return res.json(users);
  } catch (error: any) {
    console.error('Error in GET /users:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Delete user (for Admin dashboard)
router.delete('/users/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.user.delete({
      where: { id },
    });
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
