import { Router, Request, Response } from 'express';
import prisma from '../prisma.js';

const router = Router();

// Get all active rooms (for Admin or room lists)
router.get('/', async (req: Request, res: Response) => {
  try {
    const rooms = await prisma.room.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(rooms);
  } catch (error: any) {
    console.error('Error fetching all active rooms:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Get room by id/code
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const room = await prisma.room.findUnique({
      where: { id },
    });

    if (!room || !room.isActive) {
      return res.status(404).json({ error: 'Room not found or not active' });
    }

    return res.json(room);
  } catch (error: any) {
    console.error('Error fetching room:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Create or upsert room
router.post('/', async (req: Request, res: Response) => {
  try {
    const { id, settings, teacherLocation, teacher_location, students, chat } = req.body;
    const tLoc = teacherLocation || teacher_location || { lat: 0, lng: 0 };

    const room = await prisma.room.upsert({
      where: { id: String(id) },
      update: {
        settings: settings || {},
        teacherLocation: tLoc,
        students: students || [],
        chat: chat || [],
        isActive: true,
      },
      create: {
        id: String(id),
        settings: settings || {},
        teacherLocation: tLoc,
        students: students || [],
        chat: chat || [],
        isActive: true,
      },
    });

    return res.status(201).json(room);
  } catch (error: any) {
    console.error('Error creating room:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Update room
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { settings, teacherLocation, teacher_location, students, chat } = req.body;

    const data: any = {};
    if (settings !== undefined) data.settings = settings;
    if (teacherLocation !== undefined) data.teacherLocation = teacherLocation;
    if (teacher_location !== undefined) data.teacherLocation = teacher_location;
    if (students !== undefined) data.students = students;
    if (chat !== undefined) data.chat = chat;

    const updated = await prisma.room.update({
      where: { id },
      data,
    });

    return res.json(updated);
  } catch (error: any) {
    console.error('Error updating room:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Delete room
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.room.deleteMany({
      where: { id },
    });
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting room:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
