---
title: REST & WebSocket API Specifications
tags:
  - api
  - rest
  - websocket
  - specifications
---

# 🔌 ข้อกำหนดการเชื่อมต่อ API และ WebSocket (API Specifications)

เอกสารนี้ระบุการเชื่อมต่อผ่าน REST Endpoints และ Socket.io Events ทั้งหมดของระบบ CheckIn

---

## 1. REST API Endpoints

### 1.1 การเข้าสู่ระบบ (Authentication)
- **Endpoint**: `POST /api/auth/login`
- **คำอธิบาย**: บันทึกหรือดึงข้อมูลผู้ใช้งาน (Upsert User)
- **Request Body**:
  ```json
  {
    "email": "student@university.ac.th",
    "name": "สมชาย ใจดี",
    "role": "student",
    "userId": "65010001"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "id": "c8d1933d-7d31-4a11-b4f0-466d7ad90103",
    "email": "student@university.ac.th",
    "name": "สมชาย ใจดี",
    "role": "student",
    "codeId": "65010001",
    "createdAt": "2026-09-18T08:50:00.000Z",
    "updatedAt": "2026-09-18T08:50:00.000Z"
  }
  ```

---

### 1.2 การจัดการห้องเรียน (Classrooms)
- **สร้างห้องเรียน**: `POST /api/rooms`
  - **Request Body**:
    ```json
    {
      "courseCode": "CPE101",
      "courseName": "Computer Programming",
      "teacherName": "ดร.อาจารย์ ทดสอบ",
      "teacherLat": 13.736717,
      "teacherLng": 100.523186
    }
    ```
  - **Response (201 Created)**: ข้อมูลห้องเรียนพร้อม `joinCode` (สุ่ม 6 หลัก)

- **ดึงข้อมูลห้องเรียน**: `GET /api/rooms/:code`
  - **Parameter**: `:code` (รหัส 6 หลัก หรือ courseCode)
  - **Response (200 OK)**: วัตถุห้องเรียน พร้อมอาร์เรย์ `students` และ `messages`

- **ปิดห้องเรียนและเซฟประวัติ**: `POST /api/rooms/:code/close`
  - **Response (200 OK)**:
    ```json
    {
      "success": true,
      "historyId": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
    }
    ```

---

### 1.3 ประวัติการเข้าเรียน (Attendance History)
- **Endpoint**: `GET /api/history?studentId=65010001`
- **คำอธิบาย**: ดึงประวัติการเข้าเรียนของนักศึกษา
- **Response (200 OK)**:
  ```json
  [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "day": 18,
      "dateStr": "18 ก.ย. 2569",
      "code": "CPE101",
      "name": "Computer Programming",
      "time": "14:35",
      "status": "อยู่จนจบคาบ",
      "type": "success"
    }
  ]
  ```

---

### 1.4 ตารางเรียนของนักศึกษา (Schedules)
- **ดึงตารางเรียน**: `GET /api/schedules?email=student@university.ac.th`
- **เพิ่มวิชาเรียน**: `POST /api/schedules`
  - **Request Body**:
    ```json
    {
      "email": "student@university.ac.th",
      "code": "CPE101",
      "name": "Computer Programming",
      "day": "Monday",
      "time": "09:00 - 12:00",
      "location": "อาคารเรียนรวม 3 ชั้น 4"
    }
    ```
- **ลบวิชาเรียน**: `DELETE /api/schedules/:id`

---

## 2. WebSocket Real-time Events (Socket.io)

| Event Name | Direction | Payload | คำอธิบาย |
| :--- | :--- | :--- | :--- |
| `join_room` | Client -> Server | `{ roomCode, studentId, name, major, lat, lng, role }` | ส่งคำขอเข้าร่วมห้องเรียน |
| `room_data` | Server -> Client | `{ joinCode, courseCode, courseName, teacherLocation, students, chat }` | ส่งข้อมูลห้องเรียนทั้งหมดกลับไปยังผู้ใช้ |
| `heartbeat` | Client -> Server | `{ roomCode, studentId, lat, lng }` | นักศึกษาส่งพิกัดทุก 10 วินาที เพื่ออัปเดตระยะและ lastSeen |
| `students_updated` | Server -> Client | `StudentType[]` | Broadcast รายชื่อนักศึกษาและระยะห่างล่าสุด |
| `send_message` | Client -> Server | `{ roomCode, sender, role, text }` | ส่งข้อความแชทในห้องเรียน |
| `new_message` | Server -> Client | `ChatMessage` | Broadcast ข้อความใหม่ให้ทุกคนในห้อง |
| `kick_student` | Client (T) -> Server | `{ roomCode, studentId }` | อาจารย์สั่งตัดชื่อนักศึกษาออกจากห้อง |
| `student_kicked` | Server -> Client | `{ studentId }` | แจ้งเตือนนักศึกษาว่าถูกเชิญออกจากห้อง |
| `end_class` | Client (T) -> Server | `{ roomCode }` | อาจารย์ส่งสัญญาณปิดคลาส |
| `class_ended` | Server -> Client | - | แจ้งเตือนนักศึกษาทุกคนว่าคลาสสิ้นสุดลงแล้ว |

---

## เอกสารเชื่อมโยง
- [[System Architecture|สถาปัตยกรรมระบบ]]
- [[Realtime & GPS Architecture|การทำงานของ WebSocket และ GPS]]
- [[Database Schema (ERD)|โครงสร้างตารางที่เก็บข้อมูล API เหล่านี้]]
