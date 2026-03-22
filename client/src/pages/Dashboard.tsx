import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useLocation } from "wouter";

export default function Dashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();

  const { data: summary, isLoading } = trpc.dashboard.summary.useQuery(
    { month, year },
    { enabled: !!user }
  );

  const handlePreviousMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentDate(newDate);
  };

  const monthName = new Date(year, month - 1).toLocaleDateString("th-TH" as any, {
    month: "long",
    year: "numeric",
  } as any);

  const chartData = summary?.categoryBreakdown?.map((cat: any) => ({
    name: cat.name,
    value: parseFloat(cat.amount as any),
    type: cat.type,
  })) || [];

  const incomeData = chartData.filter((d: any) => d.type === "income");
  const expenseData = chartData.filter((d: any) => d.type === "expense");

  const COLORS = ["#10b981", "#f59e0b", "#3b82f6", "#8b5cf6", "#ec4899", "#ef4444"];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="container py-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-heading-lg text-foreground">บัญชีรายรับรายจ่าย</h1>
            <div className="flex gap-3">
              <Button
                onClick={() => navigate("/settings")}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                ⚙️ ตั้งค่า
              </Button>
              <Button
                onClick={() => navigate("/receipt-upload")}
                variant="outline"
                className="flex items-center gap-2"
              >
                📸 อ่านใบเสร็จ
              </Button>
              <Button
                onClick={() => navigate("/transactions")}
                className="flex items-center gap-2 bg-accent hover:bg-accent/90"
              >
                <Plus size={20} />
                บันทึกรายการใหม่
              </Button>
            </div>
          </div>

          {/* Month Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousMonth}
              className="flex items-center gap-1"
            >
              <ChevronLeft size={18} />
              ก่อนหน้า
            </Button>
            <h2 className="text-heading-md text-foreground">{monthName}</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextMonth}
              className="flex items-center gap-1"
            >
              ถัดไป
              <ChevronRight size={18} />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
          </div>
        ) : summary ? (
          <div className="space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Income Card */}
              <Card className="card-elegant overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-label text-muted-foreground mb-2">รายรับทั้งหมด</p>
                      <p className="text-heading-md text-foreground">
                        ฿{parseFloat(summary.totalIncome).toLocaleString("th-TH", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-lg gradient-income flex items-center justify-center">
                      <span className="text-2xl">💰</span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Expense Card */}
              <Card className="card-elegant overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-label text-muted-foreground mb-2">รายจ่ายทั้งหมด</p>
                      <p className="text-heading-md text-foreground">
                        ฿{parseFloat(summary.totalExpense).toLocaleString("th-TH", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-lg gradient-expense flex items-center justify-center">
                      <span className="text-2xl">💸</span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Balance Card */}
              <Card className="card-elegant overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-label text-muted-foreground mb-2">คงเหลือ</p>
                      <p className={`text-heading-md ${parseFloat(summary.balance) >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                        ฿{parseFloat(summary.balance).toLocaleString("th-TH", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${parseFloat(summary.balance) >= 0 ? "gradient-income" : "gradient-expense"}`}>
                      <span className="text-2xl">{parseFloat(summary.balance) >= 0 ? "📈" : "📉"}</span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Category Breakdown - Pie Chart */}
              {chartData.length > 0 && (
                <Card className="card-elegant p-6">
                  <h3 className="text-heading-sm text-foreground mb-6">การแบ่งตามหมวดหมู่</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ฿${value.toFixed(0)}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: any) => `฿${value.toLocaleString("th-TH" as any, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </Card>
              )}

              {/* Income vs Expense Comparison */}
              <Card className="card-elegant p-6">
                <h3 className="text-heading-sm text-foreground mb-6">เปรียบเทียบรายรับและรายจ่าย</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={[
                      {
                        name: "รายการ",
                        รายรับ: parseFloat(summary.totalIncome),
                        รายจ่าย: parseFloat(summary.totalExpense),
                      },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip
                      formatter={(value: any) => `฿${value.toLocaleString("th-TH" as any, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    />
                    <Legend />
                    <Bar dataKey="รายรับ" fill="#10b981" />
                    <Bar dataKey="รายจ่าย" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* Transaction Summary */}
            <Card className="card-elegant p-6">
              <h3 className="text-heading-sm text-foreground mb-4">สรุปรายการ</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-body-sm text-muted-foreground">จำนวนรายการทั้งหมด</p>
                  <p className="text-heading-md text-foreground">{summary.transactionCount}</p>
                </div>
                <Button
                  onClick={() => navigate("/transactions")}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  ดูรายการทั้งหมด
                  <ChevronRight size={18} />
                </Button>
              </div>
            </Card>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-body-lg text-muted-foreground">ไม่มีข้อมูล</p>
          </div>
        )}
      </div>
    </div>
  );
}
