"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "./lib/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Form States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("student"); // Default เป็นนักศึกษา

  // ตรวจสอบว่าเคย Login ไว้แล้วหรือยัง
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // ดึงข้อมูล Role จาก Firestore
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          // บันทึกข้อมูลลง localStorage เพื่อให้หน้า Dashboard ดึงไปใช้ต่อได้
          localStorage.setItem(user.uid, JSON.stringify(userData));
          
          // แยกหน้าตาม Role
          if (userData.role === "admin") router.push("/admin");
          else if (userData.role === "teacher") router.push("/dashboard/teacher");
          else router.push("/dashboard");
        }
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      if (isLogin) {
        // === เข้าสู่ระบบ ===
        await signInWithEmailAndPassword(auth, email, password);
        // การเปลี่ยนหน้าจะถูกจัดการโดย onAuthStateChanged ใน useEffect
      } else {
        // === สมัครสมาชิก ===
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        const userData = {
          userId: user.uid,
          name: name,
          email: email,
          role: role,
        };

        // สร้าง Document ใน collection "users"
        await setDoc(doc(db, "users", user.uid), userData);
        localStorage.setItem(user.uid, JSON.stringify(userData));
        
        // สมัครเสร็จให้เด้งไปหน้าตาม Role
        if (role === "teacher") router.push("/dashboard/teacher");
        else router.push("/dashboard");
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      setErrorMsg("อีเมลหรือรหัสผ่านไม่ถูกต้อง (หรืออาจจะมีอีเมลนี้ในระบบแล้ว)");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-4 font-sans text-white">
      <div className="bg-[#161925] border border-gray-800 p-8 rounded-3xl shadow-2xl w-full max-w-md animate-fadeIn">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-blue-400 mb-2">Classroom System</h1>
          <p className="text-gray-400 text-sm">ระบบจัดการห้องเรียนและเช็คชื่อเข้าเรียน</p>
        </div>

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl text-sm mb-6 text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-semibold text-gray-400 mb-1">ชื่อ - นามสกุล</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#1e2233] border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="สมชาย ใจดี"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-400 mb-1">อีเมล</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#1e2233] border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="example@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-400 mb-1">รหัสผ่าน (ขั้นต่ำ 6 ตัว)</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#1e2233] border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="••••••••"
            />
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm font-semibold text-gray-400 mb-2">สถานะของคุณ</label>
              <div className="flex gap-4">
                <label className="flex-1 cursor-pointer">
                  <input type="radio" name="role" value="student" checked={role === "student"} onChange={(e) => setRole(e.target.value)} className="hidden peer" />
                  <div className="text-center p-3 rounded-xl border border-gray-700 peer-checked:border-blue-500 peer-checked:bg-blue-500/10 transition-all text-sm font-bold">
                    👨‍🎓 นักศึกษา
                  </div>
                </label>
                <label className="flex-1 cursor-pointer">
                  <input type="radio" name="role" value="teacher" checked={role === "teacher"} onChange={(e) => setRole(e.target.value)} className="hidden peer" />
                  <div className="text-center p-3 rounded-xl border border-gray-700 peer-checked:border-blue-500 peer-checked:bg-blue-500/10 transition-all text-sm font-bold">
                    👨‍🏫 อาจารย์
                  </div>
                </label>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/20 transition-all mt-4"
          >
            {loading ? "กำลังโหลด..." : isLogin ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          {isLogin ? "ยังไม่มีบัญชีใช่ไหม? " : "มีบัญชีอยู่แล้วใช่ไหม? "}
          <button onClick={() => setIsLogin(!isLogin)} className="text-blue-400 hover:text-blue-300 font-bold underline">
            {isLogin ? "สมัครสมาชิกที่นี่" : "เข้าสู่ระบบเลย"}
          </button>
        </div>

      </div>
    </div>
  );
}