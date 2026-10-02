---
title: Non-Functional Requirements
tags:
  - srs
  - requirements
  - non-functional
---

# 🛡️ ข้อกำหนดที่ไม่ใช่เชิงฟังก์ชัน (Non-Functional Requirements - NFR)

ข้อกำหนดด้านคุณภาพ ประสิทธิภาพ ความปลอดภัย และการบำรุงรักษาระบบ CheckIn

---

## 1. ประสิทธิภาพ (Performance & Scalability)
- **Real-time Latency**: การส่งผ่านข้อความแชท และการอัปเดตสถานะการเข้าห้องเรียนผ่าน WebSocket (Socket.io) ต้องมีความล่าช้า (Latency) ไม่เกิน 500 มิลลิวินาที ภายใต้เครือข่ายอินเทอร์เน็ตปกติ
- **Heartbeat Overhead**: สัญญาณ Heartbeat มีขนาด Payload เล็กมาก ($\approx 100\text{ bytes}$) เพื่อประหยัดแบนด์วิธและแบตเตอรี่ของสมาร์ทโฟน
- **Concurrent Connections**: ระบบสถาปัตยกรรมรองรับการเชื่อมต่อพร้อมกันไม่ต่ำกว่า 200 โหนดต่อหนึ่งเซิร์ฟเวอร์ และสามารถขยายแบบ Horizontal Scalability ได้ด้วยการเพิ่ม Worker Nodes

---

## 2. ความปลอดภัย (Security & Anti-Spoofing)
- **Dynamic Session Codes**: รหัสห้องเรียน 6 หลักถูกสุ่มขึ้นใหม่ทุกครั้งที่เปิดห้องเรียน และจะหมดอายุทันทีเมื่ออาจารย์สั่งปิดคลาส
- **GPS Distance Validation**: มีการคำนวณระยะทางแบบ 2 ทาง (คำนวณทั้งฝั่ง Client เพื่อแสดงผล และฝั่ง Backend เพื่อยืนยันความถูกต้อง)
- **Cascade Deletion**: เมื่อห้องเรียนถูกปิดหรือลบ ข้อมูลชั่วคราวของห้องเรียนจะถูกตัดทิ้ง (Cascade) เพื่อไม่ให้ตกค้างในตารางห้องเรียนจริง

---

## 3. ความพร้อมใช้งานและความเสถียร (Availability & Reliability)
- **Container Isolation**: ทุกบริการแยกการทำงานใน Container อิสระ (Postgres, Backend, Frontend) หาก Frontend มีปัญหาจะไม่ส่งผลให้ข้อมูลในฐานข้อมูลสูญหาย
- **Postgres Healthcheck**: ระบบ Docker Compose มีการตั้งค่า Healthcheck เพื่อให้แน่ใจว่า PostgreSQL พร้อมรับคำขอ ก่อนที่ Backend จะเริ่มเชื่อมต่อ
- **Data Persistence**: ข้อมูลตารางเรียน บัญชีผู้ใช้ และประวัติการเช็คชื่อ ถูกจัดเก็บไว้ใน Docker Named Volume (`postgres_data`) ข้อมูลไม่สูญหายแม้ปิด Container

---

## 4. ความเข้ากันได้และการตอบสนอง (Compatibility & Usability)
- **Responsive Web Design**: รองรับหน้าจอหลากหลายขนาด ตั้งแต่ Mobile (360px) ไปจนถึง Desktop (4K)
- **Browser Compatibility**: รองรับเบราว์เซอร์สมัยใหม่ เช่น Google Chrome, Apple Safari, Microsoft Edge และ Mozilla Firefox
- **Camera Access**: รองรับการขอสิทธิ์เปิดกล้อง (Camera Permission) บน Web Browser เพื่อสแกน QR Code ตามมาตรฐาน W3C MediaDevices API

---

## เอกสารเชื่อมโยง
- [[SRS - Overview|SRS ภาพรวม]]
- [[System Architecture|สถาปัตยกรรมระบบ]]
- [[Deployment & Docker|การจัดการคอนเทนเนอร์]]
