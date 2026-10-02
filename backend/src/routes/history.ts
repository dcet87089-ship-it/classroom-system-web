import { Router, Request, Response } from 'express';
import prisma from '../prisma.js';

const router = Router();

// Get history records
router.get('/', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.query;
    const records = await prisma.history.findMany({
      orderBy: { timestamp: 'desc' },
    });

    if (!studentId) {
      return res.json(records);
    }

    // Filter for specific student
    const studentRecords = records.filter((r) => {
      const list = Array.isArray(r.studentsData) ? (r.studentsData as any[]) : [];
      return list.some((s: any) => s.studentId === studentId);
    });

    return res.json(studentRecords);
  } catch (error: any) {
    console.error('Error fetching history:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Add history record
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      courseCode,
      course_code,
      courseName,
      course_name,
      teacherName,
      teacher_name,
      sessionNum,
      session_num,
      dateStr,
      date_str,
      studentsData,
      students_data,
      teacherLocation,
      teacher_location,
    } = req.body;

    const record = await prisma.history.create({
      data: {
        courseCode: courseCode || course_code || '',
        courseName: courseName || course_name || '',
        teacherName: teacherName || teacher_name || '',
        sessionNum: String(sessionNum || session_num || '1'),
        dateStr: dateStr || date_str || new Date().toLocaleDateString('th-TH'),
        timestamp: new Date(),
        studentsData: studentsData || students_data || [],
        teacherLocation: teacherLocation || teacher_location || { lat: 0, lng: 0 },
      },
    });

    return res.status(201).json(record);
  } catch (error: any) {
    console.error('Error creating history record:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Delete history record
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.history.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting history:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
