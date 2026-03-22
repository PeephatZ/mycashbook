import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import {
  getOrCreateDefaultCategories,
  getCategories,
  createTransaction,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  getDashboardSummary,
} from "./db";
import { processReceiptImage } from "./receiptOcr";
import { sheetsRouter } from "./routers/sheetsRouter";

// Use a fixed public user ID for public access (no authentication)
const PUBLIC_USER_ID = 1;

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Categories
  categories: router({
    list: publicProcedure.query(async () => {
      return getOrCreateDefaultCategories(PUBLIC_USER_ID);
    }),
  }),

  // Transactions
  transactions: router({
    create: publicProcedure
      .input(
        z.object({
          categoryId: z.number(),
          type: z.enum(["income", "expense"]),
          amount: z.string(),
          description: z.string().optional(),
          notes: z.string().optional(),
          transactionDate: z.date(),
          receiptImageUrl: z.string().optional(),
          ocrData: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return createTransaction({
          userId: PUBLIC_USER_ID,
          ...input,
        });
      }),

    list: publicProcedure
      .input(
        z.object({
          startDate: z.date().optional(),
          endDate: z.date().optional(),
        })
      )
      .query(async ({ input }) => {
        return getTransactions(PUBLIC_USER_ID, input.startDate, input.endDate);
      }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getTransactionById(input.id, PUBLIC_USER_ID);
      }),

    update: publicProcedure
      .input(
        z.object({
          id: z.number(),
          categoryId: z.number().optional(),
          type: z.enum(["income", "expense"]).optional(),
          amount: z.string().optional(),
          description: z.string().optional(),
          notes: z.string().optional(),
          transactionDate: z.date().optional(),
          receiptImageUrl: z.string().optional(),
          ocrData: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return updateTransaction(id, PUBLIC_USER_ID, data);
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return deleteTransaction(input.id, PUBLIC_USER_ID);
      }),
  }),

  // Dashboard
  dashboard: router({
    summary: publicProcedure
      .input(
        z.object({
          month: z.number(),
          year: z.number(),
        })
      )
      .query(async ({ input }) => {
        return getDashboardSummary(PUBLIC_USER_ID, input.month, input.year);
      }),
  }),

  // Google Sheets
  sheets: sheetsRouter,

  // Receipt OCR
  receipt: router({
    processImage: publicProcedure
      .input(
        z.object({
          imageUrl: z.string().url(),
        })
      )
      .mutation(async ({ input }) => {
        try {
          const result = await processReceiptImage(input.imageUrl);
          return {
            success: true,
            data: result,
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : "ไม่สามารถอ่านใบเสร็จได้",
          };
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
