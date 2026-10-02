---
title: CheckIn - Classroom Attendance System Vault
created: 2026-09-18
tags:
  - project/checkin
  - docs/moc
---

# 🎓 CheckIn - ระบบเช็คชื่อเข้าเรียนด้วยพิกัด GPS (Classroom Attendance System)

ยินดีต้อนรับสู่ **Obsidian Vault** สำหรับระบบ **CheckIn** ระบบเช็คชื่อเข้าชั้นเรียนแบบ Real-time ด้วยการตรวจสอบตำแหน่งทางภูมิศาสตร์ (GPS) และ QR Code

---

## 📌 สารบัญภาพรวม (Map of Content - MOC)

### 1. 📋 ข้อกำหนดความต้องการของระบบ (Software Requirements Specification - SRS)
- [[SRS - Overview|ภาพรวมและวัตถุประสงค์ของระบบ (SRS Overview)]]
- [[Functional Requirements|ข้อกำหนดเชิงฟังก์ชัน (Functional Requirements - FR)]]
- [[Non-Functional Requirements|ข้อกำหนดที่ไม่ใช่เชิงฟังก์ชัน (Non-Functional Requirements - NFR)]]
- [[User Stories & Use Cases|กรณีการใช้งานและบทบาทผู้ใช้ (User Stories & Use Cases)]]

### 2. 🏛️ สถาปัตยกรรมระบบ (System Architecture)
- [[System Architecture|สถาปัตยกรรมภาพรวมระดับสูง (High-Level System Architecture)]]
- [[Component Architecture|โครงสร้างส่วนประกอบ (Component Architecture: Frontend & Backend)]]
- [[Realtime & GPS Architecture|กลไก Real-time Socket.io และการคำนวณระยะพิกัด GPS (Haversine)]]
- [[Deployment & Docker|การคอนฟิกและการรันด้วย Docker & Docker Compose]]

### 3. 🗄️ โครงสร้างฐานข้อมูล (Database Schema)
- [[Database Schema (ERD)|แผนภาพความสัมพันธ์ของข้อมูล (Entity Relationship Diagram - ERD) และ Prisma Schema]]

### 4. 🔌 ข้อกำหนดการเชื่อมต่อ API (API & WebSockets)
- [[REST & WebSocket API|คู่มือ REST API Endpoints และ WebSocket Events]]

---

## 🛠️ รายละเอียดเทคโนโลยีที่ใช้ (Tech Stack Summary)

| Layer | เทคโนโลยี | รายละเอียด |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS | Single Page Application (SPA), Nginx Web Server |
| **Backend** | Node.js, Express.js, TypeScript | REST API Service, Business Logic |
| **Realtime Engine** | Socket.io | Bidirectional WebSocket communication |
| **Database** | PostgreSQL 16 | Relational Database with ACID compliance |
| **ORM** | Prisma ORM | Type-safe schema definition & query builder |
| **Containerization** | Docker & Docker Compose | Multi-container orchestration, Isolated network |

---
> 💡 *เคล็ดลับในการเปิดดูบน Obsidian: สามารถกด `Ctrl + Click` บนลิงก์ `[[...]]` เพื่อนำทางไปยังหน้าเอกสารที่ต้องการได้ทันที หรือกด `Ctrl + G` เพื่อดู Graph View ของเอกสารทั้งหมด*
