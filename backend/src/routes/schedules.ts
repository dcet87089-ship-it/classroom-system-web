import { Router, Request, Response } from 'express';
import prisma from '../prisma.js';

const router = Router();

// Get schedules for student
router.get('/', async (req: Request, res: Response) => {
  try {
    const { studentId, email } = req.query;
    const target = String(studentId || email || '');
    if (!target) {
      return res.status(400).json({ error: 'studentId is required' });
    }

    const schedules = await prisma.schedule.findMany({
      where: { studentId: target },
      orderBy: { createdAt: 'asc' },
    });

    return res.json(schedules);
  } catch (error: any) {
    console.error('Error fetching schedules:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Add a new schedule
router.post('/', async (req: Request, res: Response) => {
  try {
    const { studentId, email, code, name, day, time, location } = req.body;
    const target = String(studentId || email || '');
    if (!target || !code || !day) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const schedule = await prisma.schedule.create({
      data: {
        studentId: target,
        code,
        name: name || '',
        day,
        time: time || '',
        location: location || '',
      },
    });

    return res.status(201).json(schedule);
  } catch (error: any) {
    console.error('Error creating schedule:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Delete a schedule
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.schedule.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting schedule:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
