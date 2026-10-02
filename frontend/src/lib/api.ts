const API_BASE = import.meta.env.VITE_BACKEND_URL ? `${import.meta.env.VITE_BACKEND_URL}/api` : '/api';

export interface UserProfile {
  id?: string;
  email: string;
  name: string;
  userId: string;
  role: 'teacher' | 'student' | 'admin';
  major?: string;
  createdAt?: string;
}

export interface TeacherCourse {
  id: string;
  code: string;
  name: string;
  teacherId?: string;
  createdAt?: string;
}

export interface StudentSchedule {
  id: string;
  studentId: string;
  code: string;
  name: string;
  day: string;
  time?: string;
  location?: string;
  createdAt?: string;
}

export interface RoomSettings {
  courseCode: string;
  name: string;
  joinCode: string;
  teacherName: string;
  startTime?: string;
  sessionNum?: string;
  maxStudents?: number;
  durationMinutes?: number;
  endTime?: number;
  pinnedMessage?: string | null;
}

export interface StudentData {
  id?: number | string;
  studentId: string;
  name: string;
  major?: string;
  status?: string;
  lat?: number;
  lng?: number;
  distance?: number;
  gpsActive?: boolean;
  gpsError?: string;
  joinTime?: string;
  firstJoinTime?: string;
  lastSeen?: string;
  totalActiveSeconds?: number;
  greenSeconds?: number;
  yellowSeconds?: number;
  redSeconds?: number;
  lastTick?: number;
  reconnectCount?: number;
  leaveReason?: string;
}

export interface ChatMessage {
  sender: string;
  text: string;
  time: string;
  type?: string;
  imageUrl?: string;
}

export interface RoomRecord {
  id: string; // joinCode
  settings: RoomSettings;
  teacherLocation: { lat: number; lng: number };
  students: StudentData[];
  chat: ChatMessage[];
  createdAt?: string;
}

export interface HistoryRecord {
  id: string;
  courseCode: string;
  courseName: string;
  teacherName: string;
  sessionNum?: string;
  dateStr: string;
  timestamp: string;
  studentsData: StudentData[];
  teacherLocation?: { lat: number; lng: number };
}

// ==========================================
// API Methods (Connected to Express + Postgres)
// ==========================================

export const getUserByEmail = async (email: string): Promise<UserProfile | null> => {
  try {
    const res = await fetch(`${API_BASE}/auth/user/${encodeURIComponent(email.trim().toLowerCase())}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('Error fetching user by email:', err);
    return null;
  }
};

export const loginUser = async (email: string, userId: string): Promise<UserProfile> => {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, userId }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'เข้าสู่ระบบไม่สำเร็จ');
  }
  return res.json();
};

export const upsertUser = async (user: UserProfile): Promise<boolean> => {
  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    return res.ok;
  } catch (err) {
    console.error('Error in upsertUser:', err);
    return false;
  }
};

export const getAllUsers = async (): Promise<UserProfile[]> => {
  try {
    const res = await fetch(`${API_BASE}/auth/users`);
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error('Error in getAllUsers:', err);
    return [];
  }
};

export const deleteUser = async (id: string): Promise<boolean> => {
  try {
    const res = await fetch(`${API_BASE}/auth/users/${id}`, { method: 'DELETE' });
    return res.ok;
  } catch (err) {
    console.error('Error in deleteUser:', err);
    return false;
  }
};

// Rooms
export const createRoom = async (roomData: RoomRecord): Promise<boolean> => {
  try {
    const res = await fetch(`${API_BASE}/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(roomData),
    });
    return res.ok;
  } catch (err) {
    console.error('Error creating room:', err);
    return false;
  }
};

export const getRoom = async (roomCode: string): Promise<RoomRecord | null> => {
  try {
    const res = await fetch(`${API_BASE}/rooms/${roomCode}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('Error fetching room:', err);
    return null;
  }
};

export const updateRoom = async (roomCode: string, updates: Partial<RoomRecord>): Promise<boolean> => {
  try {
    const res = await fetch(`${API_BASE}/rooms/${roomCode}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return res.ok;
  } catch (err) {
    console.error('Error updating room:', err);
    return false;
  }
};

export const deleteRoom = async (roomCode: string): Promise<boolean> => {
  try {
    const res = await fetch(`${API_BASE}/rooms/${roomCode}`, { method: 'DELETE' });
    return res.ok;
  } catch (err) {
    console.error('Error deleting room:', err);
    return false;
  }
};

// History
export const addHistory = async (record: Omit<HistoryRecord, 'id'>): Promise<boolean> => {
  try {
    const res = await fetch(`${API_BASE}/history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
    return res.ok;
  } catch (err) {
    console.error('Error adding history:', err);
    return false;
  }
};

export const getAllHistory = async (): Promise<HistoryRecord[]> => {
  try {
    const res = await fetch(`${API_BASE}/history`);
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error('Error in getAllHistory:', err);
    return [];
  }
};

export const deleteHistory = async (id: string): Promise<boolean> => {
  try {
    const res = await fetch(`${API_BASE}/history/${id}`, { method: 'DELETE' });
    return res.ok;
  } catch (err) {
    console.error('Error in deleteHistory:', err);
    return false;
  }
};

// Courses
export const getCoursesByTeacher = async (teacherId: string): Promise<TeacherCourse[]> => {
  try {
    const res = await fetch(`${API_BASE}/courses?teacherId=${encodeURIComponent(teacherId)}`);
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error('Error in getCoursesByTeacher:', err);
    return [];
  }
};

export const addCourse = async (course: { code: string; name: string; teacherId: string }): Promise<TeacherCourse | null> => {
  try {
    const res = await fetch(`${API_BASE}/courses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(course),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('Error in addCourse:', err);
    return null;
  }
};

export const deleteCourse = async (id: string): Promise<boolean> => {
  try {
    const res = await fetch(`${API_BASE}/courses/${id}`, { method: 'DELETE' });
    return res.ok;
  } catch (err) {
    console.error('Error in deleteCourse:', err);
    return false;
  }
};

// Schedules
export const getSchedulesByStudent = async (studentId: string): Promise<StudentSchedule[]> => {
  try {
    const res = await fetch(`${API_BASE}/schedules?studentId=${encodeURIComponent(studentId)}`);
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error('Error in getSchedulesByStudent:', err);
    return [];
  }
};

export const addSchedule = async (schedule: { studentId: string; code: string; name: string; day: string; time?: string; location?: string }): Promise<StudentSchedule | null> => {
  try {
    const res = await fetch(`${API_BASE}/schedules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(schedule),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('Error in addSchedule:', err);
    return null;
  }
};

export const deleteSchedule = async (id: string): Promise<boolean> => {
  try {
    const res = await fetch(`${API_BASE}/schedules/${id}`, { method: 'DELETE' });
    return res.ok;
  } catch (err) {
    console.error('Error in deleteSchedule:', err);
    return false;
  }
};
