import { Router, Request, Response } from 'express';
import prisma from '../prisma.js';

const router = Router();

// Get courses by teacher
router.get('/', async (req: Request, res: Response) => {
  try {
    const { teacherId } = req.query;
    const where = teacherId ? { teacherId: String(teacherId) } : {};
    const courses = await prisma.course.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return res.json(courses);
  } catch (error: any) {
    console.error('Error fetching courses:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Add course
router.post('/', async (req: Request, res: Response) => {
  try {
    const { code, name, teacherId } = req.body;
    if (!code || !name) {
      return res.status(400).json({ error: 'Missing course code or name' });
    }

    const course = await prisma.course.create({
      data: {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        teacherId: String(teacherId || ''),
      },
    });

    return res.status(201).json(course);
  } catch (error: any) {
    console.error('Error creating course:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Delete course
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.course.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting course:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
