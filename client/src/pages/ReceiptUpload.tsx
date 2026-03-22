import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Upload, ChevronLeft, Check, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";

const receiptSchema = z.object({
  categoryId: z.string().min(1, "กรุณาเลือกหมวดหมู่"),
  type: z.enum(["income", "expense"]),
  amount: z.string().min(1, "กรุณากรอกจำนวนเงิน"),
  description: z.string().optional(),
  notes: z.string().optional(),
  transactionDate: z.string().min(1, "กรุณาเลือกวันที่"),
});

type ReceiptFormData = z.infer<typeof receiptSchema>;

export default function ReceiptUpload() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<any>(null);
  const [confidence, setConfidence] = useState<number>(0);

  const { register, handleSubmit, reset, watch, setValue } = useForm<ReceiptFormData>({
    resolver: zodResolver(receiptSchema),
    defaultValues: {
      type: "expense",
      transactionDate: new Date().toISOString().split("T")[0],
    },
  });

  const { data: categories = [] } = trpc.categories.list.useQuery(undefined, { enabled: !!user });

  const processMutation = trpc.receipt.processImage.useMutation({
    onSuccess: (result) => {
      if (result.success && result.data) {
        setOcrResult(result.data);
        setConfidence(result.data.confidence);
        
        // Auto-fill form fields
        setValue("amount", result.data.amount);
        setValue("description", result.data.description);
        setValue("transactionDate", result.data.date);
        
        toast.success("อ่านใบเสร็จสำเร็จ");
      } else {
        toast.error("ไม่สามารถอ่านใบเสร็จได้: " + result.error);
      }
    },
    onError: (error) => {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    },
  });

  const createMutation = trpc.transactions.create.useMutation({
    onSuccess: () => {
      toast.success("บันทึกรายการสำเร็จ");
      reset();
      setUploadedImage(null);
      setOcrResult(null);
      navigate("/transactions");
    },
    onError: (error) => {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("กรุณาเลือกไฟล์รูปภาพ");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("ขนาดไฟล์ต้องไม่เกิน 5MB");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = async (event) => {
      const imageData = event.target?.result as string;
      setUploadedImage(imageData);

      // Process the image
      setIsProcessing(true);
      try {
        // In a real app, you would upload to S3 first, then pass the URL
        // For now, we'll use a data URL (not recommended for production)
        await processMutation.mutateAsync({
          imageUrl: imageData,
        });
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = async (data: ReceiptFormData) => {
    if (!user) return;

    const transactionDate = new Date(data.transactionDate);
    transactionDate.setHours(0, 0, 0, 0);

    await createMutation.mutateAsync({
      categoryId: parseInt(data.categoryId),
      type: data.type,
      amount: data.amount,
      description: data.description,
      notes: data.notes,
      transactionDate,
      receiptImageUrl: uploadedImage || undefined,
      ocrData: ocrResult ? JSON.stringify(ocrResult) : undefined,
    });
  };

  const typeValue = watch("type");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="container py-6">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/transactions")}
              className="flex items-center gap-1"
            >
              <ChevronLeft size={18} />
              กลับ
            </Button>
            <h1 className="text-heading-lg text-foreground">อ่านใบเสร็จ</h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <div className="space-y-6">
            <Card className="card-elegant p-6">
              <h2 className="text-heading-sm text-foreground mb-6">อัปโหลดใบเสร็จ</h2>

              {/* Upload Area */}
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-accent transition-colors cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="receipt-upload"
                  disabled={isProcessing}
                />
                <label htmlFor="receipt-upload" className="cursor-pointer block">
                  <Upload className="mx-auto mb-4 text-muted-foreground" size={40} />
                  <p className="text-body-sm text-muted-foreground mb-2">
                    ลากรูปภาพมาที่นี่ หรือคลิกเพื่อเลือก
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG, GIF ขนาดไม่เกิน 5MB
                  </p>
                </label>
              </div>

              {/* Image Preview */}
              {uploadedImage && (
                <div className="mt-6">
                  <p className="text-label text-muted-foreground mb-3">ตัวอย่างรูปภาพ</p>
                  <img
                    src={uploadedImage}
                    alt="Receipt preview"
                    className="w-full rounded-lg border border-border max-h-96 object-cover"
                  />
                </div>
              )}

              {/* Processing Status */}
              {isProcessing && (
                <div className="mt-6 p-4 bg-accent/10 border border-accent rounded-lg flex items-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-accent"></div>
                  <p className="text-body-sm text-foreground">กำลังอ่านใบเสร็จ...</p>
                </div>
              )}

              {/* OCR Result */}
              {ocrResult && (
                <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Check size={20} className="text-emerald-500" />
                    <p className="text-body-sm font-semibold text-emerald-500">อ่านสำเร็จ</p>
                  </div>
                  <div className="space-y-2 text-body-sm text-foreground">
                    <p>
                      <span className="text-muted-foreground">ความมั่นใจ:</span> {confidence}%
                    </p>
                    {confidence < 70 && (
                      <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500 rounded">
                        <AlertCircle size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-amber-600">
                          ความมั่นใจต่ำ กรุณาตรวจสอบข้อมูลอีกครั้ง
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Form Section */}
          <div>
            <Card className="card-elegant p-6">
              <h2 className="text-heading-sm text-foreground mb-6">ข้อมูลรายการ</h2>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* Type Selection */}
                <div className="space-y-2">
                  <Label className="text-label text-muted-foreground">ประเภท</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={typeValue === "income" ? "default" : "outline"}
                      className={`flex-1 ${typeValue === "income" ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
                      onClick={() => setValue("type", "income")}
                    >
                      รายรับ
                    </Button>
                    <Button
                      type="button"
                      variant={typeValue === "expense" ? "default" : "outline"}
                      className={`flex-1 ${typeValue === "expense" ? "bg-rose-600 hover:bg-rose-700" : ""}`}
                      onClick={() => setValue("type", "expense")}
                    >
                      รายจ่าย
                    </Button>
                  </div>
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-label text-muted-foreground">
                    หมวดหมู่
                  </Label>
                  <Select {...register("categoryId")}>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="เลือกหมวดหมู่" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories
                        .filter((cat: any) => cat.type === typeValue)
                        .map((cat: any) => (
                          <SelectItem key={cat.id} value={cat.id.toString()}>
                            {cat.icon} {cat.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Amount */}
                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-label text-muted-foreground">
                    จำนวนเงิน
                  </Label>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-foreground">฿</span>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="0.00"
                      step="0.01"
                      {...register("amount")}
                      className="flex-1"
                    />
                  </div>
                </div>

                {/* Date */}
                <div className="space-y-2">
                  <Label htmlFor="date" className="text-label text-muted-foreground">
                    วันที่
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    {...register("transactionDate")}
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-label text-muted-foreground">
                    รายละเอียด
                  </Label>
                  <Input
                    id="description"
                    placeholder="เช่น ค่าอาหารกลางวัน"
                    {...register("description")}
                  />
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-label text-muted-foreground">
                    หมายเหตุ
                  </Label>
                  <Input
                    id="notes"
                    placeholder="หมายเหตุเพิ่มเติม"
                    {...register("notes")}
                  />
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold py-6"
                  disabled={createMutation.isPending || !uploadedImage}
                >
                  {createMutation.isPending ? "กำลังบันทึก..." : "บันทึกรายการ"}
                </Button>
              </form>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
