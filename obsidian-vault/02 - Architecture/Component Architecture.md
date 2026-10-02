---
title: Component Architecture
tags:
  - architecture
  - frontend
  - backend
  - components
---

# 🧩 โครงสร้างส่วนประกอบ (Component Architecture)

เอกสารนี้แสดงการจัดวางโมดูลและคอมโพเนนต์ภายในทั้งฝั่ง Frontend และ Backend

---

## 1. แผนผังโครงสร้างซอร์สโค้ด (Source Directory Structure)

```text
my-new-app/
├── docker-compose.yml              # ไฟล์ควบคุมการรันระบบทั้งหมด
├── .env.example                    # ตัวอย่างค่า Environment Variables
├── backend/                        # ฝั่งเซิร์ฟเวอร์ Express.js & Prisma
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── prisma/
│   │   └── schema.prisma           # โครงสร้างฐานข้อมูล PostgreSQL
│   └── src/
│       ├── index.ts                # จุดเริ่มต้น Express + Socket.io Server
│       ├── prisma.ts               # Prisma Client Singleton
│       ├── routes/
│       │   ├── auth.ts             # REST: เข้าสู่ระบบ / ตรวจสอบสิทธิ์
│       │   ├── rooms.ts            # REST: สร้าง/ดึง/ปิดห้องเรียน
│       │   ├── history.ts          # REST: ประวัติการเช็คชื่อ
│       │   └── schedules.ts        # REST: ตารางเรียนของนักศึกษา
│       └── sockets/
│           └── roomHandler.ts      # WebSocket Event Handlers & Haversine
└── frontend/                       # ฝั่งผู้ใช้ React & Vite
    ├── Dockerfile
    ├── nginx.conf                  # การตั้งค่า Reverse Proxy Nginx
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    └── src/
        ├── App.tsx                 # ตัวจัดการเส้นทาง (React Router)
        ├── main.tsx                # จุด Render React DOM
        ├── index.css               # Tailwind CSS & สไตล์หลัก
        ├── lib/
        │   ├── api.ts              # ฟังก์ชันเรียก REST API
        │   └── socket.ts           # การเชื่อมต่อ Socket.io Client
        └── pages/
            ├── LoginPage.tsx       # หน้าเข้าสู่ระบบและเลือกบทบาท
            ├── TeacherDashboard.tsx# หน้าควบคุมคลาสเรียนสำหรับอาจารย์
            └── StudentDashboard.tsx# หน้านักศึกษา (เช็คชื่อ, ตาราง, ประวัติ)
```

---

## 2. โครงสร้างคอมโพเนนต์ฝั่ง Frontend (React Components)

```mermaid
graph TD
    App[App.tsx<br>React Router Root]
    App --> RouteLogin["Route: / (LoginPage)"]
    App --> RouteTeacher["Route: /teacher (TeacherDashboard)"]
    App --> RouteStudent["Route: /student (StudentDashboard)"]

    subgraph TeacherComponents ["คอมโพเนนต์หน้าอาจารย์"]
        RouteTeacher --> T1[ClassSettings: ตั้งค่าและเปิดคลาส]
        RouteTeacher --> T2[QRDisplay: แสดง QRCodeCanvas & รหัส 6 หลัก]
        RouteTeacher --> T3[StudentList: รายชื่อนักศึกษาแบบ Real-time]
        RouteTeacher --> T4[ChatBox: แชทและประกาศในห้อง]
    end

    subgraph StudentComponents ["คอมโพเนนต์หน้านักศึกษา"]
        RouteStudent --> S_Nav[Sidebar / Header Navigation]
        S_Nav --> TabHome[Tab 1: Home - เช็คชื่อ & เข้าห้อง]
        S_Nav --> TabSched[Tab 2: Schedule - ตารางเรียน]
        S_Nav --> TabHist[Tab 3: History - ประวัติและสถิติ]

        TabHome --> JoinBox[JoinRoom: กรอกรหัส หรือ สแกน QR]
        TabHome --> GPSBadge[GPS Status Badge: คำนวณระยะห่าง]
        TabHome --> InClassChat[In-class Chat: แชทในห้อง]
        TabHome --> PeerList[Peer List: รายชื่อเพื่อนในห้อง]

        TabSched --> AddModal[Add Course Modal]
        TabHist --> CalView[Monthly Calendar View]
        TabHist --> StatCards[Summary Metric Cards]
    end
```

---

## 3. สถาปัตยกรรมฝั่ง Backend (Modular Router & Events)

```mermaid
graph LR
    subgraph ExpressApp ["Express HTTP Server"]
        AuthRoute["/api/auth"]
        RoomsRoute["/api/rooms"]
        HistoryRoute["/api/history"]
        ScheduleRoute["/api/schedules"]
    end

    subgraph SocketServer ["Socket.io Server"]
        EventJoin["join_room"]
        EventHeartbeat["heartbeat"]
        EventMessage["send_message"]
        EventKick["kick_student"]
        EventEnd["end_class"]
    end

    subgraph PrismaClientLayer ["Prisma Client (Type-Safe ORM)"]
        UserModel[User Model]
        RoomModel[Room Model]
        StudentModel[RoomStudent Model]
        ChatModel[ChatMessage Model]
        HistoryModel[AttendanceHistory Model]
        SchedModel[Schedule Model]
    end

    AuthRoute --> UserModel
    RoomsRoute --> RoomModel
    RoomsRoute --> HistoryModel
    HistoryRoute --> HistoryModel
    ScheduleRoute --> SchedModel

    EventJoin --> RoomModel
    EventJoin --> StudentModel
    EventHeartbeat --> StudentModel
    EventMessage --> ChatModel
    EventKick --> StudentModel
    EventEnd --> HistoryModel
    EventEnd --> RoomModel
```

---

## เอกสารเชื่อมโยง
- [[System Architecture|สถาปัตยกรรมภาพรวม]]
- [[Realtime & GPS Architecture|ระบบ Real-time และการคำนวณ GPS]]
- [[REST & WebSocket API|รายการ API และ Event]]
