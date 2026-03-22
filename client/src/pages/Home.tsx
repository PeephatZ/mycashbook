import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { getLoginUrl } from "@/const";
import { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * Home page - redirects to dashboard if authenticated, shows login otherwise
 */
export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-accent" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Logo/Title */}
        <div className="space-y-4">
          <div className="text-6xl mb-4">💰</div>
          <h1 className="text-heading-lg text-foreground">บัญชีรายรับรายจ่าย</h1>
          <p className="text-body-lg text-muted-foreground">
            จัดการการเงินของคุณอย่างมีประสิทธิภาพ
          </p>
        </div>

        {/* Features */}
        <div className="space-y-3 text-left bg-card border border-border rounded-lg p-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">📊</span>
            <div>
              <p className="font-semibold text-foreground">ติดตามรายรับรายจ่าย</p>
              <p className="text-sm text-muted-foreground">ดูภาพรวมการเงินของคุณแบบเรียลไทม์</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl">📸</span>
            <div>
              <p className="font-semibold text-foreground">อ่านใบเสร็จอัตโนมัติ</p>
              <p className="text-sm text-muted-foreground">ถ่ายรูปใบเสร็จให้ AI อ่านข้อมูลให้</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl">☁️</span>
            <div>
              <p className="font-semibold text-foreground">สำรองข้อมูลอัตโนมัติ</p>
              <p className="text-sm text-muted-foreground">ส่งข้อมูลไปยัง Google Sheets</p>
            </div>
          </div>
        </div>

        {/* Login Button */}
        <Button
          onClick={() => {
            window.location.href = getLoginUrl();
          }}
          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground py-6 text-lg font-semibold"
        >
          เข้าสู่ระบบ
        </Button>

        {/* Footer */}
        <p className="text-xs text-muted-foreground">
          ข้อมูลของคุณปลอดภัยและเป็นส่วนตัว
        </p>
      </div>
    </div>
  );
}
