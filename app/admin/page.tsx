"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeCanvas } from 'qrcode.react'; 

// === นำเข้า Firebase ===
import { db, auth } from '../lib/firebase'; // เช็ค Path ให้ตรงกับโครงสร้างของคุณ (อาจจะเป็น ../lib/firebase หรือ ../../lib/firebase)
import { doc, setDoc, deleteDoc, onSnapshot, collection, addDoc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';

export default function TeacherDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);

  // State การสร้างห้องเรียน
  const [courseCode, setCourseCode] = useState("CPE101");
  const [courseName, setCourseName] = useState("Computer Programming");
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [isRoomActive, setIsRoomActive] = useState(false);
  const [teacherLocation, setTeacherLocation] = useState({ lat: 0, lng: 0 });

  // State ข้อมูลแบบ Real-time
  const [currentStudents, setCurrentStudents] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");

  useEffect(() => {
    // 1. เช็คสิทธิ์และจำลองข้อมูลอาจารย์ (ถ้าทำระบบ Login แล้วให้ใช้ Auth แทน)
    const storedData = localStorage.getItem('teacher_data');
    if (storedData) {
      setUserData(JSON.parse(storedData));
    } else {
      // จำลองข้อมูลอาจารย์ชั่วคราว
      setUserData({ name: "อาจารย์ทดสอบ", role: "teacher" }); 
    }
    setLoading(false);

    // 2. ดึงพิกัด GPS ของอาจารย์เพื่อเป็นจุดศูนย์กลางของห้องเรียน
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setTeacherLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.log("กำลังหาพิกัด GPS..."),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  // === ดักฟังข้อมูลห้องเรียนแบบ Real-time ===
  useEffect(() => {
    if (isRoomActive && roomCode) {
      const roomRef = doc(db, "rooms", roomCode);
      const unsubscribe = onSnapshot(roomRef, (docSnap) => {
        if (docSnap.exists()) {
          const roomData = docSnap.data();
          setCurrentStudents(roomData.students || []);
          setChatMessages(roomData.chat || []);
        }
      });
      return () => unsubscribe();
    }
  }, [isRoomActive, roomCode]);

  // === ฟังก์ชัน: เปิดคลาสเรียน ===
  const handleStartClass = async () => {
    if (teacherLocation.lat === 0) {
      alert("กำลังรอพิกัด GPS กรุณารอสักครู่...");
      return;
    }

    // สุ่มรหัสห้องเรียน 6 หลัก
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    try {
      await setDoc(doc(db, "rooms", newCode), {
        settings: {
          courseCode,
          name: courseName,
          joinCode: newCode,
          teacherName: userData?.name || "อาจารย์",
          startTime: new Date().toISOString()
        },
        teacherLocation: teacherLocation,
        students: [],
        chat: [{ sender: "System", text: `เปิดคลาสวิชา ${courseName} แล้ว`, time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) }]
      });

      setRoomCode(newCode);
      setIsRoomActive(true);
    } catch (error) {
      console.error("Error creating room:", error);
      alert("เกิดข้อผิดพลาดในการเปิดคลาส");
    }
  };

  // === ฟังก์ชัน: ปิดคลาสเรียน และบันทึกประวัติ ===
  const handleEndClass = async () => {
    if (!roomCode) return;
    
    const confirmEnd = window.confirm("คุณต้องการปิดคลาสและบันทึกประวัติการเข้าเรียนใช่หรือไม่?");
    if (!confirmEnd) return;

    try {
      // 1. นำข้อมูลนักศึกษาปัจจุบันไปบันทึกใน collection 'history'
      const historyData = {
        courseCode,
        courseName,
        teacherName: userData?.name || "อาจารย์",
        timestamp: new Date().toISOString(),
        dateStr: new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }),
        studentsData: currentStudents
      };

      await addDoc(collection(db, "history"), historyData);

      // 2. ลบห้องเรียนออกจาก collection 'rooms' (นักศึกษาจะถูกเตะออกอัตโนมัติจาก useEffect ฝั่งเด็ก)
      await deleteDoc(doc(db, "rooms", roomCode));

      setRoomCode(null);
      setIsRoomActive(false);
      setCurrentStudents([]);
      setChatMessages([]);
      alert("บันทึกประวัติและปิดคลาสสำเร็จ!");

    } catch (error) {
      console.error("Error ending class:", error);
      alert("เกิดข้อผิดพลาดในการปิดคลาส");
    }
  };

  // === ฟังก์ชัน: เตะนักศึกษาออกจากห้อง ===
  const handleKickStudent = async (studentId: string) => {
    if (!roomCode) return;
    const roomRef = doc(db, "rooms", roomCode);
    const updatedStudents = currentStudents.filter(s => s.studentId !== studentId);
    
    await updateDoc(roomRef, {
      students: updatedStudents
    });
  };

  // === ฟังก์ชัน: ส่งแชท ===
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim() === "" || !roomCode) return;

    const newMsg = { 
      sender: "อาจารย์", 
      text: chatInput, 
      time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) 
    };

    const roomRef = doc(db, "rooms", roomCode);
    await updateDoc(roomRef, {
      chat: [...chatMessages, newMsg]
    });
    setChatInput("");
  };

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.clear();
    router.push('/');
  };

  if (loading) return <div className="min-h-screen bg-[#0f1117] text-white flex justify-center items-center">กำลังโหลด...</div>;

  return (
    <div className="min-h-screen bg-[#0f1117] text-white flex flex-col font-sans">
      
      {/* Navbar */}
      <nav className="bg-[#161925] border-b border-gray-800 px-8 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-blue-400">ระบบจัดการห้องเรียน (อาจารย์)</h1>
          <p className="text-sm text-gray-500">ยินดีต้อนรับ, {userData?.name}</p>
        </div>
        <button onClick={handleLogout} className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-4 py-2 rounded-lg font-medium transition-colors">
          ออกจากระบบ
        </button>
      </nav>

      <div className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* แผงควบคุม (ซ้าย) */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* ส่วนจัดการห้องเรียน */}
          <div className="bg-[#161925] border border-gray-800 rounded-3xl p-6 shadow-xl">
            <h2 className="text-xl font-bold mb-6">ตั้งค่าคลาสเรียน</h2>
            
            {!isRoomActive ? (
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">รหัสวิชา</label>
                  <input 
                    type="text" 
                    value={courseCode} 
                    onChange={(e) => setCourseCode(e.target.value)}
                    className="w-full bg-[#1e2233] border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500" 
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">ชื่อวิชา</label>
                  <input 
                    type="text" 
                    value={courseName} 
                    onChange={(e) => setCourseName(e.target.value)}
                    className="w-full bg-[#1e2233] border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500" 
                  />
                </div>
                
                <button 
                  onClick={handleStartClass}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/20 transition-all mt-4"
                >
                  ▶️ เปิดคลาสเรียน
                </button>
              </div>
            ) : (
              <div className="text-center space-y-6">
                <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-2xl">
                  <p className="text-blue-400 text-sm mb-1">สถานะ: กำลังสอน</p>
                  <p className="text-xl font-bold">{courseCode} - {courseName}</p>
                </div>

                <div className="bg-white p-4 rounded-2xl inline-block shadow-lg">
                  <QRCodeCanvas value={`CheckIn-${roomCode}`} size={180} />
                </div>
                
                <div>
                  <p className="text-gray-400 text-sm mb-2">หรือให้นักศึกษากรอกรหัสนี้</p>
                  <p className="text-4xl font-black tracking-widest text-blue-400">{roomCode}</p>
                </div>

                <button 
                  onClick={handleEndClass}
                  className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-red-500/20 transition-all"
                >
                  ⏹️ ปิดคลาสและบันทึกประวัติ
                </button>
              </div>
            )}
          </div>

          {/* ช่องแชท */}
          {isRoomActive && (
            <div className="bg-[#161925] border border-gray-800 rounded-3xl h-96 flex flex-col shadow-xl overflow-hidden">
              <div className="p-4 border-b border-gray-800 bg-[#1e2233]">
                <h3 className="font-bold">💬 ประกาศ/แชทห้องเรียน</h3>
              </div>
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`p-3 rounded-xl max-w-[90%] border border-gray-700 ${msg.sender === "อาจารย์" ? 'bg-blue-600/20 border-blue-500/30 ml-auto rounded-tr-none' : msg.sender === 'System' ? 'bg-gray-800 mx-auto text-center' : 'bg-[#1e2233] rounded-tl-none'}`}>
                    {msg.sender !== 'System' && <p className={`text-xs mb-1 ${msg.sender === "อาจารย์" ? 'text-blue-400' : 'text-blue-400'}`}>{msg.sender} <span className="text-gray-500 ml-1">{msg.time}</span></p>}
                    <p className={`text-sm ${msg.sender === 'System' ? 'text-gray-400 text-xs' : ''}`}>{msg.text}</p>
                  </div>
                ))}
              </div>
              <form onSubmit={handleSendMessage} className="p-4 bg-[#1e2233] border-t border-gray-800 flex gap-2">
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="พิมพ์ประกาศ..." 
                  className="flex-1 bg-[#0f1117] border border-gray-700 rounded-xl px-4 py-2 focus:outline-none focus:border-blue-500 text-sm" 
                />
                <button type="submit" className="bg-blue-600 px-4 py-2 rounded-xl font-bold">ส่ง</button>
              </form>
            </div>
          )}

        </div>

        {/* รายชื่อนักศึกษา (ขวา) */}
        <div className="lg:col-span-2">
          <div className="bg-[#161925] border border-gray-800 rounded-3xl shadow-xl flex flex-col h-full overflow-hidden">
            <div className="p-6 border-b border-gray-800 bg-[#1e2233] flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">นักศึกษาที่เข้าร่วม</h2>
                <p className="text-gray-400 text-sm mt-1">อัปเดตแบบ Real-time</p>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/30 px-4 py-2 rounded-xl">
                <span className="text-2xl font-black text-blue-400">{currentStudents.length}</span>
                <span className="text-gray-400 ml-2">คน</span>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4">
              {currentStudents.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-500">
                  <div className="text-6xl mb-4">🪑</div>
                  <p>ยังไม่มีนักศึกษาเข้าเรียน</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentStudents.map((student) => {
                    // เช็คสถานะการเชื่อมต่อ (ถ้าหายไปเกิน 20 วินาที = แอบปิดแอป/หลุด)
                    const lastSeenTime = student.lastSeen ? new Date(student.lastSeen).getTime() : 0;
                    const isOffline = (new Date().getTime() - lastSeenTime) > 20000;

                    return (
                      <div key={student.studentId} className={`p-4 rounded-2xl border ${isOffline ? 'bg-yellow-500/5 border-yellow-500/20' : 'bg-[#1e2233] border-gray-700'} flex justify-between items-center transition-all`}>
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center text-xl">👤</div>
                            <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#1e2233] ${isOffline ? 'bg-yellow-500' : 'bg-blue-500'}`}></div>
                          </div>
                          <div>
                            <h4 className="font-bold text-white">{student.name}</h4>
                            <p className="text-xs text-gray-400">{student.studentId} • {student.major}</p>
                            <p className="text-[10px] text-blue-400 mt-1">เข้าห้องเมื่อ: {student.joinTime}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleKickStudent(student.studentId)}
                          className="text-gray-500 hover:text-red-400 hover:bg-red-500/10 p-2 rounded-lg transition-colors"
                          title="เตะออกจากห้อง"
                        >
                          ✕
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}