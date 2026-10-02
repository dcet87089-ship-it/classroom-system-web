import { Server, Socket } from 'socket.io';
import prisma from '../prisma.js';

export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
};

export function setupRoomSocket(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Join room channel
    socket.on('join_room', async (data: {
      roomCode: string;
      studentId: string;
      name: string;
      major?: string;
      lat?: number;
      lng?: number;
      role?: string;
    }) => {
      const { roomCode, studentId, name, major, lat = 0, lng = 0, role = 'student' } = data;

      try {
        const room = await prisma.room.findFirst({
          where: {
            OR: [{ joinCode: roomCode }, { courseCode: roomCode }, { id: roomCode }],
            isActive: true,
          },
          include: { students: true, messages: { orderBy: { createdAt: 'asc' } } },
        });

        if (!room) {
          socket.emit('error_message', 'ไม่พบห้องเรียนนี้ หรืออาจารย์ยังไม่ได้เปิดคลาส');
          return;
        }

        socket.join(room.joinCode);
        (socket as any).roomCode = room.joinCode;
        (socket as any).studentId = studentId;

        if (role === 'student' && studentId) {
          const distance = calculateDistance(lat, lng, room.teacherLat, room.teacherLng);
          const joinTime = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

          await prisma.roomStudent.upsert({
            where: {
              roomId_studentId: {
                roomId: room.id,
                studentId,
              },
            },
            update: {
              name,
              major: major || 'วิศวกรรมคอมพิวเตอร์',
              lat,
              lng,
              distance,
              lastSeen: new Date(),
              isOnline: true,
            },
            create: {
              roomId: room.id,
              studentId,
              name,
              major: major || 'วิศวกรรมคอมพิวเตอร์',
              lat,
              lng,
              distance,
              joinTime,
              lastSeen: new Date(),
              isOnline: true,
            },
          });
        }

        // Fetch refreshed room data
        const updatedRoom = await prisma.room.findUnique({
          where: { id: room.id },
          include: { students: true, messages: { orderBy: { createdAt: 'asc' } } },
        });

        if (updatedRoom) {
          io.to(room.joinCode).emit('room_data', {
            joinCode: updatedRoom.joinCode,
            courseCode: updatedRoom.courseCode,
            courseName: updatedRoom.courseName,
            teacherName: updatedRoom.teacherName,
            teacherLocation: { lat: updatedRoom.teacherLat, lng: updatedRoom.teacherLng },
            students: updatedRoom.students,
            chat: updatedRoom.messages,
          });
        }
      } catch (error: any) {
        console.error('Error in join_room:', error);
        socket.emit('error_message', 'เกิดข้อผิดพลาดในการเข้าห้องเรียน');
      }
    });

    // Heartbeat from student
    socket.on('heartbeat', async (data: { roomCode: string; studentId: string; lat?: number; lng?: number }) => {
      const { roomCode, studentId, lat = 0, lng = 0 } = data;
      if (!roomCode || !studentId) return;

      try {
        const room = await prisma.room.findFirst({
          where: {
            OR: [{ joinCode: roomCode }, { id: roomCode }],
            isActive: true,
          },
        });

        if (!room) return;

        const distance = calculateDistance(lat, lng, room.teacherLat, room.teacherLng);

        await prisma.roomStudent.updateMany({
          where: {
            roomId: room.id,
            studentId,
          },
          data: {
            lat,
            lng,
            distance,
            lastSeen: new Date(),
            isOnline: true,
          },
        });

        // Broadcast updated students to room
        const students = await prisma.roomStudent.findMany({
          where: { roomId: room.id },
        });

        io.to(room.joinCode).emit('students_updated', students);
      } catch (error) {
        console.error('Error in heartbeat:', error);
      }
    });

    // Send chat message
    socket.on('send_message', async (data: { roomCode: string; sender: string; role: string; text: string }) => {
      const { roomCode, sender, role, text } = data;
      if (!roomCode || !text) return;

      try {
        const room = await prisma.room.findFirst({
          where: {
            OR: [{ joinCode: roomCode }, { id: roomCode }],
            isActive: true,
          },
        });

        if (!room) return;

        const time = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
        const newMsg = await prisma.chatMessage.create({
          data: {
            roomId: room.id,
            sender,
            role,
            text,
            time,
          },
        });

        io.to(room.joinCode).emit('new_message', newMsg);
      } catch (error) {
        console.error('Error in send_message:', error);
      }
    });

    // Kick student (Teacher)
    socket.on('kick_student', async (data: { roomCode: string; studentId: string }) => {
      const { roomCode, studentId } = data;
      try {
        const room = await prisma.room.findFirst({
          where: { OR: [{ joinCode: roomCode }, { id: roomCode }] },
        });

        if (!room) return;

        await prisma.roomStudent.deleteMany({
          where: { roomId: room.id, studentId },
        });

        io.to(room.joinCode).emit('student_kicked', { studentId });

        const students = await prisma.roomStudent.findMany({
          where: { roomId: room.id },
        });
        io.to(room.joinCode).emit('students_updated', students);
      } catch (error) {
        console.error('Error kicking student:', error);
      }
    });

    // Leave room (Student)
    socket.on('leave_room', async (data: { roomCode: string; studentId: string }) => {
      const { roomCode, studentId } = data;
      try {
        const room = await prisma.room.findFirst({
          where: { OR: [{ joinCode: roomCode }, { id: roomCode }] },
        });

        if (!room) return;

        await prisma.roomStudent.deleteMany({
          where: { roomId: room.id, studentId },
        });

        const students = await prisma.roomStudent.findMany({
          where: { roomId: room.id },
        });
        io.to(room.joinCode).emit('students_updated', students);
      } catch (error) {
        console.error('Error in leave_room:', error);
      }
    });

    // End class (Teacher)
    socket.on('end_class', async (data: { roomCode: string }) => {
      const { roomCode } = data;
      try {
        const room = await prisma.room.findFirst({
          where: { OR: [{ joinCode: roomCode }, { id: roomCode }] },
          include: { students: true },
        });

        if (!room) return;

        const studentsSnapshot = room.students.map((s) => ({
          studentId: s.studentId,
          name: s.name,
          major: s.major,
          lat: s.lat,
          lng: s.lng,
          distance: s.distance,
          joinTime: s.joinTime,
          lastSeen: s.lastSeen.toISOString(),
        }));

        await prisma.attendanceHistory.create({
          data: {
            courseCode: room.courseCode,
            courseName: room.courseName,
            teacherName: room.teacherName,
            dateStr: new Date().toLocaleDateString('th-TH', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            }),
            timestamp: new Date(),
            studentsData: studentsSnapshot,
          },
        });

        await prisma.room.delete({
          where: { id: room.id },
        });

        io.to(room.joinCode).emit('class_ended');
      } catch (error) {
        console.error('Error in end_class:', error);
      }
    });

    socket.on('disconnect', () => {
      // socket disconnect
    });
  });
}
