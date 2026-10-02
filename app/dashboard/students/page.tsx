"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Scanner } from '@yudiel/react-qr-scanner';


// === 1. นำเข้า Firebase ===
import { db, auth } from '../../lib/firebase';
import { doc, getDoc, updateDoc, arrayUnion, onSnapshot, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { signOut } from 'firebase/auth'; // เพิ่ม signOut

interface UserDataType {
  name: string;
  userId: string;
  role: string;
}

export default function StudentDashboard() {
  const router = useRouter();
  const [activeMenu, setActiveMenu] = useState<'home' | 'schedule' | 'history'>('home');
  const [userData, setUserData] = useState<UserDataType | null>(null);
  const [loading, setLoading] = useState(true);

  const [isScanning, setIsScanning] = useState(false);
  const [joinedClass, setJoinedClass] = useState<{code: string, name: string} | null>(null);
  const [joinCodeInput, setJoinCodeInput] = useState("");

  const [myLocation, setMyLocation] = useState({ lat: 0, lng: 0 });
  const [teacherLocation, setTeacherLocation] = useState({ lat: 0, lng: 0 });
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [currentStudents, setCurrentStudents] = useState<any[]>([]); 

  // === State ประวัติการเรียนจาก Firebase ===
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [historyData, setHistoryData] = useState<any[]>([]); // เก็บประวัติของจริง

  const [calendarDate, setCalendarDate] = useState(new Date());

  const currentMonth = calendarDate.getMonth();
  const currentYear = calendarDate.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const monthNamesThai = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", 
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];

  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [refreshSchedule, setRefreshSchedule] = useState(0);

  // === 1. โหลดข้อมูลผู้ใช้ และดึงพิกัด GPS ===
  useEffect(() => {
    const storedData = localStorage.getItem(Object.keys(localStorage)[0] || "");
    if (storedData) {
      setUserData(JSON.parse(storedData));
    } else {
      router.push('/');
    }
    setLoading(false);

    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.log("กำลังหาพิกัด GPS..."),
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [router]);

  // === 1.1 ระบบส่งสัญญาณชีพจร (Heartbeat) แบบแยกออกมาไม่ให้ซ้อนกัน ===
  useEffect(() => {
    if (joinedClass && userData) {
      const interval = setInterval(async () => {
        const roomRef = doc(db, "rooms", joinedClass.code);
        const currentTime = new Date().toISOString();
        
        const updatedStudents = currentStudents.map((s: any) => 
          s.studentId === userData.userId ? { ...s, lastSeen: currentTime } : s
        );

        await updateDoc(roomRef, {
          students: updatedStudents
        });
      }, 10000); // 10000ms = 10 วินาที

      return () => clearInterval(interval);
    }
  }, [joinedClass, userData, currentStudents]);

  // === 2. ดักฟังข้อมูลห้องเรียนจาก Firebase แบบ Real-time ===
  useEffect(() => {
    if (joinedClass && userData) {
      const roomRef = doc(db, "rooms", joinedClass.code);
      
      const unsubscribe = onSnapshot(roomRef, (docSnap) => {
        if (docSnap.exists()) {
          const roomData = docSnap.data();
          
          setTeacherLocation(roomData.teacherLocation || { lat: 0, lng: 0 });
          setChatMessages(roomData.chat || []);
          setCurrentStudents(roomData.students || []);

          const isMeInside = roomData.students?.some((s: any) => s.studentId === userData.userId);
          if (!isMeInside && roomData.students?.length > 0) {
            alert("คุณถูกอาจารย์เชิญออกจากห้องเรียน");
            setJoinedClass(null); 
          }
        } else {
          alert("อาจารย์ได้ทำการยุบห้องเรียนแล้ว");
          setJoinedClass(null);
        }
      });

      return () => unsubscribe();
    }
  }, [joinedClass, userData]);

  // === 2.1 ดึงข้อมูลประวัติการเรียนของตัวเอง เมื่อกดเข้าเมนู 'history' ===
  useEffect(() => {
    if (activeMenu === 'history' && userData) {
      const fetchMyHistory = async () => {
        try {
          const q = query(collection(db, "history"), orderBy("timestamp", "desc"));
          const snap = await getDocs(q);
          
          const myRecords: any[] = [];
          
          snap.docs.forEach(docSnap => {
            const data = docSnap.data();
            // หานักศึกษาคนนี้ในรายการ studentsData ของคลาสนี้
            const myRecord = data.studentsData?.find((s: any) => s.studentId === userData.userId);
            
            if (myRecord) {
              // เช็คว่าออฟไลน์ตอนอาจารย์ยุบห้องไหม (เกิน 60 วินาที)
              const lastSeenTime = myRecord.lastSeen ? new Date(myRecord.lastSeen).getTime() : 0;
              const classEndTime = new Date(data.timestamp).getTime();
              const isOffline = (classEndTime - lastSeenTime) > 60000;
              
              const dateObj = new Date(data.timestamp);
              
              myRecords.push({
                id: docSnap.id,
                day: dateObj.getDate(), // ดึงแค่วันที่มาใช้กับปฏิทิน
                dateStr: data.dateStr,
                code: data.courseCode,
                name: data.courseName,
                time: myRecord.joinTime || '-',
                status: isOffline ? "ออฟไลน์ก่อนปิดคลาส" : "อยู่จนจบคาบ",
                type: isOffline ? "warning" : "success"
              });
            }
          });
          
          setHistoryData(myRecords);
        } catch (error) {
          console.error("Error fetching history:", error);
        }
      };
      
      fetchMyHistory();
    }
  }, [activeMenu, userData]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const joinRoom = async (courseCode: string) => {
    if (!userData) return;
    
    setIsScanning(false);
    setJoinCodeInput(""); 

    const roomRef = doc(db, "rooms", courseCode);
    const roomSnap = await getDoc(roomRef);

    if (roomSnap.exists()) {
      setJoinedClass({ code: courseCode, name: roomSnap.data().settings?.name || "กำลังเข้าเรียน..." });
      
      const newStudent = {
        id: Date.now(),
        studentId: userData.userId, 
        name: userData.name,        
        major: "วิศวกรรมคอมพิวเตอร์", 
        status: "เข้าเรียน",
        lat: myLocation.lat,
        lng: myLocation.lng,
        joinTime: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        lastSeen: new Date().toISOString() // เพิ่ม lastSeen ครั้งแรกตอนกดเข้าห้อง
      };

      await updateDoc(roomRef, {
        students: arrayUnion(newStudent)
      });
    } else {
      alert("ไม่พบห้องเรียนนี้ หรืออาจารย์ยังไม่ได้เปิดคลาส");
    }
  };

  const handleScanSuccess = (text: string) => {
    if (text.includes("CheckIn-")) {
      const courseCode = text.replace("CheckIn-", "");
      joinRoom(courseCode);
    } else {
      alert("QR Code ไม่ถูกต้อง");
    }
  };

  const handleJoinWithCode = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!joinCodeInput) return;

    try {
      const roomsRef = collection(db, "rooms");
      const q = query(roomsRef, where("settings.joinCode", "==", joinCodeInput));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const foundCourseCode = querySnapshot.docs[0].id;
        joinRoom(foundCourseCode);
      } else {
        alert("รหัสห้องไม่ถูกต้อง หรืออาจารย์ยังไม่ได้เปิดห้องเรียนนี้");
      }
    } catch (error) {
      console.error("Error joining room:", error);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    }
  };

  const handleLeaveRoom = async () => {
    if (joinedClass && userData) {
      const roomRef = doc(db, "rooms", joinedClass.code);
      const updatedStudents = currentStudents.filter((s: any) => s.studentId !== userData.userId);
      await updateDoc(roomRef, { students: updatedStudents });
      setJoinedClass(null);
    }
  };

  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const input = e.currentTarget.elements.namedItem("message") as HTMLInputElement;
    if (input.value && joinedClass) {
      const newMsg = { sender: userData?.name, text: input.value, time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) };
      
      const roomRef = doc(db, "rooms", joinedClass.code);
      await updateDoc(roomRef, {
        chat: arrayUnion(newMsg)
      });
      
      input.value = "";
    }
  };

  const handleSaveCourse = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const code = (form.elements.namedItem("code") as HTMLInputElement).value;
    const name = (form.elements.namedItem("name") as HTMLInputElement).value;
    const day = (form.elements.namedItem("day") as HTMLSelectElement).value;
    const time = (form.elements.namedItem("time") as HTMLInputElement).value;
    const location = (form.elements.namedItem("location") as HTMLInputElement).value;

    if(code && day) {
      const sched = JSON.parse(localStorage.getItem('my_schedule') || "{}");
      if(!sched[day]) sched[day] = [];
      sched[day].push({ id: Date.now(), code, name, time, location });
      localStorage.setItem('my_schedule', JSON.stringify(sched));
      
      setShowAddCourseModal(false); 
      setRefreshSchedule(prev => prev + 1); 
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth); // เตะออกจากระบบ Firebase ของจริง
      localStorage.clear(); // ล้างข้อมูลแคชในเครื่อง
      router.push('/');
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  if (loading || !userData) return <div className="min-h-screen bg-[#0f1117] text-white flex items-center justify-center">กำลังโหลด...</div>;

  const dist = calculateDistance(myLocation.lat, myLocation.lng, teacherLocation.lat, teacherLocation.lng);
  
  let statusColor = "";
  let statusMessage = "";
  let distTextColor = "";

  if (dist <= 50) {
      statusColor = "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      statusMessage = "✅ ระยะปลอดภัย (สถานะ: เข้าเรียน)";
      distTextColor = "text-emerald-400";
  } else if (dist <= 100) {
      statusColor = "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      statusMessage = "⚠️ คุณเริ่มออกห่างจากห้องเรียน (สถานะ: เฝ้าระวัง)";
      distTextColor = "text-yellow-400";
  } else {
      statusColor = "bg-red-500/20 text-red-400 border-red-500/30";
      statusMessage = "🚫 คุณอยู่ไกลเกิน 100 เมตร (สถานะ: ขาดเรียน)";
      distTextColor = "text-red-400";
  }

  // ตัวกรองข้อมูลสำหรับแสดงในตาราง
  const filteredHistory = selectedDate ? historyData.filter(h => h.day === selectedDate) : historyData;
  
  // คำนวณสรุปสถิติจริง
  const totalClasses = historyData.length;
  const successClasses = historyData.filter(h => h.type === 'success').length;
  const warningClasses = historyData.filter(h => h.type === 'warning').length;
  const errorClasses = historyData.filter(h => h.type === 'error').length;

  return (
    <div className="flex min-h-screen bg-[#0f1117] text-white font-sans relative">
      
      {/* ========================================================= */}
      {/* Modal: หน้าต่างเพิ่มวิชาเรียน */}
      {/* ========================================================= */}
      {showAddCourseModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#161925] p-8 rounded-3xl border border-gray-700 w-full max-w-md relative shadow-2xl">
            <button onClick={() => setShowAddCourseModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-white text-xl font-bold">
              ✕
            </button>
            
            <h2 className="text-2xl font-bold text-emerald-400 mb-6">เพิ่มวิชาเรียน</h2>

            <form onSubmit={handleSaveCourse} className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-300 mb-2 block">รหัสวิชา</label>
                <input name="code" placeholder="เช่น CPE101" className="w-full p-4 rounded-xl bg-[#1e2233] border border-gray-700 focus:outline-none focus:border-emerald-500" required />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-300 mb-2 block">ชื่อวิชา</label>
                <input name="name" placeholder="เช่น Computer Programming" className="w-full p-4 rounded-xl bg-[#1e2233] border border-gray-700 focus:outline-none focus:border-emerald-500" required />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-300 mb-2 block">วันเรียน</label>
                <select name="day" className="w-full p-4 rounded-xl bg-[#1e2233] border border-gray-700 focus:outline-none focus:border-emerald-500 text-white cursor-pointer" required>
                  <option value="Monday">วันจันทร์ (Monday)</option>
                  <option value="Tuesday">วันอังคาร (Tuesday)</option>
                  <option value="Wednesday">วันพุธ (Wednesday)</option>
                  <option value="Thursday">วันพฤหัสบดี (Thursday)</option>
                  <option value="Friday">วันศุกร์ (Friday)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-300 mb-2 block">เวลา</label>
                  <input name="time" placeholder="เช่น 09:00 - 12:00" className="w-full p-4 rounded-xl bg-[#1e2233] border border-gray-700 focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-300 mb-2 block">สถานที่</label>
                  <input name="location" placeholder="เช่น อาคารอำนวยการ" className="w-full p-4 rounded-xl bg-[#1e2233] border border-gray-700 focus:outline-none focus:border-emerald-500" />
                </div>
              </div>

              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white p-4 rounded-xl font-bold text-lg mt-6 shadow-lg shadow-emerald-500/30 transition-all">
                บันทึกตารางเรียน
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div className="w-64 bg-[#161925] p-6 border-r border-gray-800 flex flex-col z-10">
        <h1 className="text-xl font-bold text-emerald-400 mb-8">เมนูนักศึกษา</h1>
        <div className="space-y-4 flex-1">
          <button onClick={() => setActiveMenu('home')} className={`w-full text-left p-3 rounded-lg font-medium transition-all flex items-center gap-3 ${activeMenu === 'home' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'text-gray-400 hover:bg-[#1e2233] hover:text-white'}`}>
            <span>📱</span> เข้าเรียน
          </button>
          <button onClick={() => setActiveMenu('schedule')} className={`w-full text-left p-3 rounded-lg font-medium transition-all flex items-center gap-3 ${activeMenu === 'schedule' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'text-gray-400 hover:bg-[#1e2233] hover:text-white'}`}>
            <span>📅</span> ตารางเรียน
          </button>
          <button onClick={() => setActiveMenu('history')} className={`w-full text-left p-3 rounded-lg font-medium transition-all flex items-center gap-3 ${activeMenu === 'history' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'text-gray-400 hover:bg-[#1e2233] hover:text-white'}`}>
            <span>📊</span> ประวัติเข้าเรียน
          </button>
        </div>
        <div className="mb-4 pt-4 border-t border-gray-800">
          <p className="text-sm font-semibold text-emerald-400">{userData.name}</p>
          <p className="text-xs text-gray-500">{userData.userId}</p>
        </div>
        <button onClick={handleLogout} className="text-gray-500 hover:text-red-400 text-left px-3 py-2 transition-colors text-sm font-medium">ออกจากระบบ</button>
      </div>

      <div className="flex-1 p-8 overflow-y-auto h-screen flex flex-col">
        
        {/* ===================================== */}
        {/* 1. หน้าเข้าเรียน (Live Room) */}
        {/* ===================================== */}
        {activeMenu === 'home' && (
          <div className="animate-fadeIn flex-1 flex flex-col">
            <h2 className="text-3xl font-bold mb-6">เข้าสู่ห้องเรียน</h2>
            
            {!joinedClass ? (
              <div className="bg-[#161925] p-10 rounded-3xl border border-gray-800 shadow-xl max-w-xl mx-auto w-full">
                <p className="text-gray-400 mb-8 text-center">เลือกวิธีเข้าเรียน (ระบบจะจับระยะห่าง GPS)</p>
                
                {isScanning ? (
                  <div className="max-w-sm mx-auto animate-fadeIn text-center mb-8">
                    <div className="overflow-hidden rounded-2xl border-4 border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                      <Scanner onScan={(result) => handleScanSuccess(result[0].rawValue)} onError={(error) => console.log(error?.message)} />
                    </div>
                    <button onClick={() => setIsScanning(false)} className="mt-6 text-gray-400 hover:text-white underline">ยกเลิกการสแกน</button>
                  </div>
                ) : (
                  <button onClick={() => setIsScanning(true)} className="w-full bg-emerald-600 py-4 rounded-xl font-bold text-lg hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-500/20 mb-8">
                    📸 สแกน QR Code
                  </button>
                )}

                <div className="flex items-center gap-4 mb-8">
                  <div className="h-px bg-gray-800 flex-1"></div>
                  <span className="text-gray-500 text-sm">หรือเผื่อกล้องไม่ดี</span>
                  <div className="h-px bg-gray-800 flex-1"></div>
                </div>

                <form onSubmit={handleJoinWithCode} className="flex gap-3">
                  <input 
                    type="text" 
                    placeholder="ใส่รหัสห้อง 6 หลัก" 
                    maxLength={6}
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value)}
                    className="flex-1 bg-[#1e2233] border border-gray-700 rounded-xl px-6 py-4 text-center text-lg font-bold tracking-widest focus:outline-none focus:border-emerald-500 text-emerald-400" 
                    required 
                  />
                  <button type="submit" className="bg-blue-600 hover:bg-blue-500 px-8 rounded-xl font-bold transition-all">
                    เข้าร่วม
                  </button>
                </form>

              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
                <div className="lg:col-span-1 bg-[#161925] border border-gray-800 rounded-2xl flex flex-col overflow-hidden">
                  <div className="p-4 border-b border-gray-800 bg-[#1e2233]">
                    <h3 className="font-bold">💬 แชทห้องเรียน</h3>
                  </div>
                  <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                    {chatMessages.map((msg, idx) => (
                      <div key={idx} className={`p-3 rounded-xl max-w-[90%] border border-gray-700 ${msg.sender === userData.name ? 'bg-emerald-600/20 border-emerald-500/30 ml-auto rounded-tr-none' : msg.sender === 'System' ? 'bg-gray-800 mx-auto text-center' : 'bg-[#1e2233] rounded-tl-none'}`}>
                        {msg.sender !== 'System' && <p className={`text-xs mb-1 ${msg.sender === userData.name ? 'text-emerald-400' : 'text-blue-400'}`}>{msg.sender} <span className="text-gray-500 ml-1">{msg.time}</span></p>}
                        <p className={`text-sm ${msg.sender === 'System' ? 'text-gray-400 text-xs' : ''}`}>{msg.text}</p>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-800 bg-[#1e2233] flex gap-2">
                    <input name="message" placeholder="พิมพ์ข้อความ..." className="flex-1 bg-[#0f1117] border border-gray-700 rounded-xl px-4 text-sm focus:outline-none focus:border-emerald-500" required />
                    <button type="submit" className="px-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold">ส่ง</button>
                  </form>
                </div>

                <div className="lg:col-span-2 bg-[#161925] border border-gray-800 rounded-3xl p-8 shadow-2xl relative flex flex-col">
                  <div className="absolute top-0 left-0 w-full h-1bg-linear-to-r from-emerald-500 to-teal-400"></div>
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                        <h2 className="text-xl font-bold text-red-400">กำลังติดตามตำแหน่ง...</h2>
                      </div>
                      <h3 className="text-3xl font-extrabold text-white">{joinedClass.code}</h3>
                    </div>
                    <button onClick={handleLeaveRoom} className="bg-gray-800 hover:bg-red-500 hover:text-white text-gray-400 px-4 py-2 rounded-lg font-medium transition-colors">ออกจากการติดตาม</button>
                  </div>

                  <div className="bg-[#1e2233] rounded-2xl p-8 text-center border border-gray-700 flex-1 flex flex-col justify-center items-center">
                    <p className="text-gray-400 mb-4">ระยะห่างจากห้องเรียน</p>
                    <p className={`text-6xl font-black tracking-tighter mb-4 ${distTextColor}`}>
                      {dist.toFixed(0)} <span className="text-2xl text-gray-500 font-normal">เมตร</span>
                    </p>
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold border ${statusColor}`}>
                      {statusMessage}
                    </div>
                  </div>
                </div>
                
              </div>
            )}
          </div>
        )}
        
        {/* ===================================== */}
        {/* 2. หน้าตารางเรียน */}
        {/* ===================================== */}
        {activeMenu === 'schedule' && (
          <div className="animate-fadeIn flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold">ตารางเรียน</h2>
              
              <button 
                onClick={() => setShowAddCourseModal(true)} 
                className="bg-emerald-600 hover:bg-emerald-500 px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20"
              >
                + เพิ่มวิชา
              </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => {
                const scheduleData = JSON.parse(localStorage.getItem('my_schedule') || "{}");
                const daysSchedule = scheduleData[day] || [];
                
                return (
                  <div key={day} className="bg-[#161925] border border-gray-800 rounded-3xl p-5 shadow-xl flex flex-col">
                    <h3 className="text-lg font-bold text-emerald-400 mb-4 border-b border-gray-700 pb-2 capitalize">{day}</h3>
                    
                    {daysSchedule.length === 0 ? (
                      <p className="text-gray-600 text-sm italic text-center py-4">ไม่มีวิชาเรียน</p>
                    ) : (
                      daysSchedule.map((item: any) => (
                        <div key={item.id} className="bg-[#1e2233] p-4 rounded-xl border border-gray-700 mb-3 hover:border-emerald-500/50 transition-colors">
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-bold text-white">{item.code}</span>
                            {item.time && <span className="bg-blue-500/20 text-blue-400 text-[10px] px-2 py-1 rounded-lg">{item.time}</span>}
                          </div>
                          <p className="text-gray-400 text-xs mb-2 truncate">{item.name}</p>
                          {item.location && <p className="text-[10px] text-gray-500">📍 {item.location}</p>}
                        </div>
                      ))
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===================================== */}
        {/* 3. หน้าประวัติและสถิติ (ดึงข้อมูลจริงจาก Firebase!) */}
        {/* ===================================== */}
        {activeMenu === 'history' && (
          <div className="animate-fadeIn flex-1 flex flex-col">
            <div className="flex justify-between items-end mb-6">
               <h2 className="text-3xl font-bold">ประวัติและสถิติ</h2>
               {selectedDate && (
                 <button onClick={() => setSelectedDate(null)} className="text-sm bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg text-gray-300 transition-colors">
                    🔄 ดูประวัติทั้งหมด
                 </button>
               )}
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
               <div className="bg-[#161925] border border-gray-800 p-6 rounded-2xl text-center shadow-lg"><p className="text-gray-400 text-sm mb-1">เข้าเรียนทั้งหมด</p><p className="text-3xl font-bold text-white">{totalClasses} <span className="text-sm font-normal text-gray-500">คาบ</span></p></div>
               <div className="bg-emerald-500/5 border border-emerald-500/30 p-6 rounded-2xl text-center shadow-lg"><p className="text-emerald-500/80 text-sm mb-1">อยู่จนจบ (เขียว)</p><p className="text-3xl font-bold text-emerald-400">{successClasses} <span className="text-sm font-normal text-emerald-500/50">คาบ</span></p></div>
               <div className="bg-yellow-500/5 border border-yellow-500/30 p-6 rounded-2xl text-center shadow-lg"><p className="text-yellow-500/80 text-sm mb-1">แอบปิดแอป (เหลือง)</p><p className="text-3xl font-bold text-yellow-400">{warningClasses} <span className="text-sm font-normal text-yellow-500/50">คาบ</span></p></div>
               <div className="bg-red-500/5 border border-red-500/30 p-6 rounded-2xl text-center shadow-lg"><p className="text-red-500/80 text-sm mb-1">ขาดเรียน (แดง)</p><p className="text-3xl font-bold text-red-400">{errorClasses} <span className="text-sm font-normal text-red-500/50">คาบ</span></p></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* ปฏิทินแบบโต้ตอบได้ */}
              <div className="flex flex-col">
                 <div className="flex justify-between items-center mb-4">
                    <button onClick={() => { setCalendarDate(new Date(currentYear, currentMonth - 1, 1)); setSelectedDate(null); }} className="text-gray-400 hover:text-white bg-[#1e2233] px-3 py-1 rounded-lg transition-colors">&lt;</button>
                    <h3 className="font-bold text-lg text-emerald-400">{monthNamesThai[currentMonth]} {currentYear}</h3>
                    <button onClick={() => { setCalendarDate(new Date(currentYear, currentMonth + 1, 1)); setSelectedDate(null); }} className="text-gray-400 hover:text-white bg-[#1e2233] px-3 py-1 rounded-lg transition-colors">&gt;</button>
                 </div>
                 
                 <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-2 font-bold">
                    <div>อา</div><div>จ</div><div>อ</div><div>พ</div><div>พฤ</div><div>ศ</div><div>ส</div>
                 </div>
                 
                 <div className="grid grid-cols-7 gap-2 text-center text-sm font-medium">
                    {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                      <div key={`empty-${i}`} className="py-2"></div>
                    ))}
                    
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                       const dayRecords = historyData.filter(h => h.day === day);
                       let bgColor = "hover:bg-[#1e2233] text-gray-300";
                       
                       if (dayRecords.length > 0) {
                          const hasError = dayRecords.some(r => r.type === 'error');
                          const hasWarning = dayRecords.some(r => r.type === 'warning');
                          if (hasError) bgColor = "bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg";
                          else if (hasWarning) bgColor = "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-lg";
                          else bgColor = "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg";
                       }

                       const isSelected = selectedDate === day;

                       return (
                         <div 
                           key={day} 
                           onClick={() => setSelectedDate(selectedDate === day ? null : day)}
                           className={`py-2 cursor-pointer transition-all relative ${bgColor} ${isSelected ? 'ring-2 ring-white scale-110 z-10 shadow-lg font-black bg-[#1e2233]' : ''}`}
                         >
                            {day}
                            {/* จุดไข่ปลาสีฟ้าเตือนว่ามีเรียนหลายวิชา */}
                            {dayRecords.length > 1 && (
                               <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-[#161925]"></div>
                            )}
                         </div>
                       )
                    })}
                 </div>
                 
                 <div className="mt-6 space-y-3 text-xs text-gray-400 border-t border-gray-800 pt-4">
                    <div className="flex items-center gap-3"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> เข้าเรียนปกติ / อยู่จนจบ</div>
                    <div className="flex items-center gap-3"><span className="w-3 h-3 rounded-full bg-yellow-500"></span> แอบปิดแอป (สัญญาณขาดหาย)</div>
                 </div>
              </div>

              {/* ตารางประวัติ */}
              <div className="bg-[#161925] rounded-3xl border border-gray-800 overflow-hidden shadow-xl lg:col-span-2 flex flex-col">
                 <div className="bg-[#1e2233] border-b border-gray-800 p-4">
                    <h3 className="font-bold text-gray-300">
                       {selectedDate ? `รายการเข้าเรียนวันที่ ${selectedDate} ${monthNamesThai[currentMonth]} ${currentYear}` : `รายการเข้าเรียนทั้งหมดในเดือน${monthNamesThai[currentMonth]}`}
                    </h3>
                 </div>
                 
                 <div className="flex-1 overflow-auto">
                    <table className="w-full text-left">
                       <thead className="bg-[#1e2233]/50 text-gray-400 text-sm border-b border-gray-800">
                          <tr>
                             <th className="p-4 font-semibold">วันที่</th>
                             <th className="p-4 font-semibold">วิชา</th>
                             <th className="p-4 font-semibold text-center">เวลาเช็คชื่อ</th>
                             <th className="p-4 font-semibold text-center">สถานะ</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-800">
                          {filteredHistory.length > 0 ? (
                             filteredHistory.map(record => (
                                <tr key={record.id} className="hover:bg-[#1e2233]/40 transition-colors">
                                   <td className="p-4 text-gray-300 text-sm whitespace-nowrap">{record.dateStr}</td>
                                   <td className="p-4 font-bold text-blue-400">
                                      {record.code} 
                                      <span className="text-gray-500 text-xs font-normal block mt-1">{record.name}</span>
                                   </td>
                                   <td className="p-4 text-center text-gray-300 font-mono text-sm">{record.time}</td>
                                   <td className="p-4 text-center">
                                      {record.type === 'success' && <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-lg text-xs font-bold">✅ {record.status}</span>}
                                      {record.type === 'warning' && <span className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 px-3 py-1 rounded-lg text-xs font-bold">⚠️ {record.status}</span>}
                                      {record.type === 'error' && <span className="bg-red-500/10 text-red-400 border border-red-500/30 px-3 py-1 rounded-lg text-xs font-bold">🚫 {record.status}</span>}
                                   </td>
                                </tr>
                             ))
                          ) : (
                             <tr>
                                <td colSpan={4} className="p-10 text-center text-gray-500">
                                   <div className="text-4xl mb-3">📭</div>
                                   ไม่มีประวัติการเข้าเรียน
                                </td>
                             </tr>
                          )}
                       </tbody>
                    </table>
                 </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}