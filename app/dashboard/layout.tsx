export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // ไฟล์นี้ทำหน้าที่แค่เป็นกล่องเปล่าๆ ครอบหน้าเว็บ
  return <div className="bg-[#0f1117] min-h-screen text-white">{children}</div>;
}