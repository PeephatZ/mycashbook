import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { Download, ChevronLeft, Check, Loader2 } from "lucide-react";
import { useLocation } from "wouter";

export default function Settings() {
  const [, navigate] = useLocation();
  const [isExporting, setIsExporting] = useState(false);

  const exportMutation = trpc.sheets.exportToCSV.useQuery(undefined, {
    enabled: false,
  });

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const result = await exportMutation.refetch();
      if (result.data?.success && result.data.data) {
        const { content, filename, mimeType } = result.data.data;

        // Create blob and download
        const blob = new Blob([content], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast.success("ส่งออกข้อมูลสำเร็จ");
      } else {
        toast.error("ไม่สามารถส่งออกข้อมูลได้");
      }
    } catch (error) {
      toast.error("เกิดข้อผิดพลาด: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setIsExporting(false);
    }
  };

  const handleLogout = async () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="container py-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-1"
            >
              <ChevronLeft size={18} />
              กลับ
            </Button>
            <h1 className="text-heading-lg text-foreground">ตั้งค่า</h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-8">
        <div className="max-w-2xl space-y-6">
          {/* Profile Section */}
          <Card className="card-elegant p-6">
            <h2 className="text-heading-sm text-foreground mb-6">ข้อมูลส่วนตัว</h2>

            <div className="space-y-4">
              <div>
                <p className="text-label text-muted-foreground mb-2">สถานะ</p>
                <p className="text-body-lg text-foreground">เข้าใช้งานแบบสาธารณะ (ไม่ต้องล็อกอิน)</p>
              </div>
            </div>
          </Card>

          {/* Export Section */}
          <Card className="card-elegant p-6">
            <h2 className="text-heading-sm text-foreground mb-6">ส่งออกข้อมูล</h2>

            <div className="space-y-4">
              <p className="text-body-sm text-muted-foreground">
                ส่งออกข้อมูลรายรับรายจ่ายทั้งหมดเป็นไฟล์ CSV เพื่อใช้กับ Google Sheets หรือโปรแกรมอื่น ๆ
              </p>

              <Button
                onClick={handleExportCSV}
                disabled={isExporting}
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold py-6 flex items-center justify-center gap-2"
              >
                {isExporting ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    กำลังส่งออก...
                  </>
                ) : (
                  <>
                    <Download size={20} />
                    ส่งออกเป็น CSV
                  </>
                )}
              </Button>

              <div className="p-4 bg-blue-500/10 border border-blue-500 rounded-lg">
                <p className="text-body-sm text-blue-600">
                  💡 <strong>เคล็ดลับ:</strong> ไฟล์ CSV ที่ส่งออกสามารถนำเข้าไปยัง Google Sheets ได้โดยตรง
                  ไปที่ Google Sheets &gt; ไฟล์ &gt; นำเข้า &gt; อัปโหลด
                </p>
              </div>
            </div>
          </Card>

          {/* Account Section */}
          <Card className="card-elegant p-6">
            <h2 className="text-heading-sm text-foreground mb-6">บัญชี</h2>

            <div className="space-y-4">
              <p className="text-body-sm text-muted-foreground">
                ออกจากระบบและกลับไปยังหน้าเข้าสู่ระบบ
              </p>

              <p className="text-body-sm text-muted-foreground">เนื่องจากเป็นโหมดสาธารณะ จึงไม่มีการออกจากระบบ</p>
            </div>
          </Card>

          {/* About Section */}
          <Card className="card-elegant p-6">
            <h2 className="text-heading-sm text-foreground mb-6">เกี่ยวกับ</h2>

            <div className="space-y-4 text-body-sm text-muted-foreground">
              <div>
                <p className="font-semibold text-foreground mb-1">บัญชีรายรับรายจ่าย</p>
                <p>เวอร์ชัน 1.0.0</p>
              </div>

              <div>
                <p className="font-semibold text-foreground mb-1">คุณสมบัติ</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>บันทึกรายรับรายจ่ายอัตโนมัติ</li>
                  <li>อ่านใบเสร็จด้วย AI</li>
                  <li>ส่งออกข้อมูลไปยัง Google Sheets</li>
                  <li>ดูกราฟสรุปรายรับรายจ่าย</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold text-foreground mb-1">ความเป็นส่วนตัว</p>
                <p>
                  ข้อมูลของคุณปลอดภัยและเป็นส่วนตัว เราไม่แชร์ข้อมูลของคุณกับบุคคลที่สาม
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
