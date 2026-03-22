import { eq, and, gte, lte, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, categories, transactions, sheetsExports } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============ Categories ============

export async function getOrCreateDefaultCategories(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const defaultCategories = [
    { name: "เงินเดือน", type: "income" as const, icon: "💰" },
    { name: "ค่าอาหาร", type: "expense" as const, icon: "🍽️" },
    { name: "ค่าเดินทาง", type: "expense" as const, icon: "🚗" },
    { name: "ค่าสาธารณูปโภค", type: "expense" as const, icon: "💡" },
    { name: "ค่าบันเทิง", type: "expense" as const, icon: "🎬" },
    { name: "ค่าสุขภาพ", type: "expense" as const, icon: "⚕️" },
    { name: "อื่น ๆ", type: "expense" as const, icon: "📌" },
  ];

  const existing = await db.select().from(categories).where(eq(categories.userId, userId));
  
  if (existing.length === 0) {
    for (const cat of defaultCategories) {
      await db.insert(categories).values({
        userId,
        name: cat.name,
        type: cat.type,
        icon: cat.icon,
      });
    }
  }

  return db.select().from(categories).where(eq(categories.userId, userId));
}

export async function getCategories(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(categories).where(eq(categories.userId, userId));
}

// ============ Transactions ============

export async function createTransaction(data: {
  userId: number;
  categoryId: number;
  type: "income" | "expense";
  amount: string;
  description?: string;
  notes?: string;
  transactionDate: Date;
  receiptImageUrl?: string;
  ocrData?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(transactions).values(data);
  return result;
}

export async function getTransactions(userId: number, startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return [];

  let query: any = db.select().from(transactions).where(eq(transactions.userId, userId));

  if (startDate && endDate) {
    query = query.where(
      and(
        gte(transactions.transactionDate, startDate),
        lte(transactions.transactionDate, endDate)
      )
    );
  }

  return query.orderBy(desc(transactions.transactionDate));
}

export async function getTransactionById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await (db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
    .limit(1) as any);

  return result.length > 0 ? result[0] : null;
}

export async function updateTransaction(id: number, userId: number, data: Partial<{
  categoryId: number;
  type: "income" | "expense";
  amount: string;
  description: string;
  notes: string;
  transactionDate: Date;
  receiptImageUrl: string;
  ocrData: string;
}>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return (db
    .update(transactions)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId))) as any);
}

export async function deleteTransaction(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .delete(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
}

// ============ Dashboard Summary ============

export async function getDashboardSummary(userId: number, month: number, year: number) {
  const db = await getDb();
  if (!db) return null;

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const monthTransactions = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.transactionDate, startDate),
        lte(transactions.transactionDate, endDate)
      )
    ) as any;

  let totalIncome = 0;
  let totalExpense = 0;
  const categoryBreakdown: Record<string, { name: string; amount: number; type: string }> = {};

  for (const tx of monthTransactions) {
    const amount = parseFloat(tx.amount);
    if (tx.type === "income") {
      totalIncome += amount;
    } else {
      totalExpense += amount;
    }

    // Get category info
    const catQuery = await db
      .select()
      .from(categories)
      .where(eq(categories.id, tx.categoryId)) as any;
    const cat = catQuery.limit(1);
    if (cat.length > 0) {
      const catName = cat[0].name;
      if (!categoryBreakdown[catName]) {
        categoryBreakdown[catName] = { name: catName, amount: 0, type: tx.type };
      }
      categoryBreakdown[catName].amount += amount;
    }
  }

  return {
    totalIncome: totalIncome.toFixed(2),
    totalExpense: totalExpense.toFixed(2),
    balance: (totalIncome - totalExpense).toFixed(2),
    categoryBreakdown: Object.values(categoryBreakdown),
    transactionCount: monthTransactions.length,
  };
}

// ============ Google Sheets ============

export async function saveSheetsExport(data: {
  userId: number;
  spreadsheetId: string;
  spreadsheetUrl: string;
  recordCount: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(sheetsExports).values(data);
}

export async function getLatestSheetsExport(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(sheetsExports)
    .where(eq(sheetsExports.userId, userId))
    .orderBy(desc(sheetsExports.createdAt))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}
