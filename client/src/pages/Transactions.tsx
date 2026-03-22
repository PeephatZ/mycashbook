import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Trash2, Edit2, ChevronLeft, Plus } from "lucide-react";
import { useLocation } from "wouter";

const transactionSchema = z.object({
  categoryId: z.string().min(1, "กรุณาเลือกหมวดหมู่"),
  type: z.enum(["income", "expense"]),
  amount: z.string().min(1, "กรุณากรอกจำนวนเงิน"),
  description: z.string().optional(),
  notes: z.string().optional(),
  transactionDate: z.string().min(1, "กรุณาเลือกวันที่"),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

export default function Transactions() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");

  const { register, handleSubmit, reset, watch, setValue } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: "expense",
      transactionDate: new Date().toISOString().split("T")[0],
    },
  });

  const { data: categories = [] } = trpc.categories.list.useQuery(undefined, { enabled: !!user });
  const { data: transactions = [], refetch: refetchTransactions } = trpc.transactions.list.useQuery(
    {},
    { enabled: !!user }
  );

  const createMutation = trpc.transactions.create.useMutation({
    onSuccess: () => {
      toast.success("บันทึกรายการสำเร็จ");
      reset();
      refetchTransactions();
    },
    onError: (error) => {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    },
  });

  const deleteMutation = trpc.transactions.delete.useMutation({
    onSuccess: () => {
      toast.success("ลบรายการสำเร็จ");
      refetchTransactions();
    },
    onError: (error) => {
      toast.error("เกิดข้อผิดพลาด: " + error.message);
    },
  });

  const onSubmit = async (data: TransactionFormData) => {
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
    });
  };

  const filteredTransactions = transactions.filter((tx: any) => {
    const matchesType = filterType === "all" || tx.type === filterType;
    const matchesSearch =
      tx.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

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
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-1"
            >
              <ChevronLeft size={18} />
              กลับ
            </Button>
            <h1 className="text-heading-lg text-foreground">บันทึกรายการ</h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-1">
            <Card className="card-elegant p-6">
              <h2 className="text-heading-sm text-foreground mb-6">บันทึกรายการใหม่</h2>

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
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? "กำลังบันทึก..." : "บันทึกรายการ"}
                </Button>
              </form>
            </Card>
          </div>

          {/* Transactions List */}
          <div className="lg:col-span-2">
            <Card className="card-elegant p-6">
              <h2 className="text-heading-sm text-foreground mb-6">รายการทั้งหมด</h2>

              {/* Filters */}
              <div className="space-y-4 mb-6">
                <Input
                  placeholder="ค้นหารายการ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
                <div className="flex gap-2">
                  <Button
                    variant={filterType === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterType("all")}
                    className={filterType === "all" ? "bg-accent hover:bg-accent/90" : ""}
                  >
                    ทั้งหมด
                  </Button>
                  <Button
                    variant={filterType === "income" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterType("income")}
                    className={filterType === "income" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                  >
                    รายรับ
                  </Button>
                  <Button
                    variant={filterType === "expense" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterType("expense")}
                    className={filterType === "expense" ? "bg-rose-600 hover:bg-rose-700" : ""}
                  >
                    รายจ่าย
                  </Button>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="overflow-x-auto">
                {filteredTransactions.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-2 text-label text-muted-foreground">วันที่</th>
                        <th className="text-left py-3 px-2 text-label text-muted-foreground">หมวดหมู่</th>
                        <th className="text-left py-3 px-2 text-label text-muted-foreground">รายละเอียด</th>
                        <th className="text-right py-3 px-2 text-label text-muted-foreground">จำนวนเงิน</th>
                        <th className="text-center py-3 px-2 text-label text-muted-foreground">การกระทำ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransactions.map((tx: any) => {
                        const category = categories.find((c: any) => c.id === tx.categoryId);
                        const isIncome = tx.type === "income";
                        const amount = parseFloat(tx.amount);

                        return (
                          <tr key={tx.id} className="border-b border-border hover:bg-card/50 transition-colors">
                            <td className="py-3 px-2 text-body-sm text-foreground">
                              {new Date(tx.transactionDate).toLocaleDateString("th-TH")}
                            </td>
                            <td className="py-3 px-2 text-body-sm text-foreground">
                              {category?.icon} {category?.name}
                            </td>
                            <td className="py-3 px-2 text-body-sm text-muted-foreground">
                              {tx.description || "-"}
                            </td>
                            <td className={`py-3 px-2 text-body-sm font-semibold text-right ${isIncome ? "text-emerald-500" : "text-rose-500"}`}>
                              {isIncome ? "+" : "-"}฿{amount.toLocaleString("th-TH", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </td>
                            <td className="py-3 px-2 text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteMutation.mutate({ id: tx.id })}
                                className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                              >
                                <Trash2 size={16} />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-body-lg text-muted-foreground">ไม่มีรายการ</p>
                  </div>
                )}
              </div>

              {/* Summary */}
              {filteredTransactions.length > 0 && (
                <div className="mt-6 pt-6 border-t border-border space-y-2">
                  <div className="flex justify-between">
                    <span className="text-body-sm text-muted-foreground">รวมรายรับ:</span>
                    <span className="text-body-sm font-semibold text-emerald-500">
                      ฿{filteredTransactions
                        .filter((tx: any) => tx.type === "income")
                        .reduce((sum: number, tx: any) => sum + parseFloat(tx.amount), 0)
                        .toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-body-sm text-muted-foreground">รวมรายจ่าย:</span>
                    <span className="text-body-sm font-semibold text-rose-500">
                      ฿{filteredTransactions
                        .filter((tx: any) => tx.type === "expense")
                        .reduce((sum: number, tx: any) => sum + parseFloat(tx.amount), 0)
                        .toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
