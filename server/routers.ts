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
    list: protectedProcedure.query(async ({ ctx }) => {
      return getOrCreateDefaultCategories(ctx.user.id);
    }),
  }),

  // Transactions
  transactions: router({
    create: protectedProcedure
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
      .mutation(async ({ ctx, input }) => {
        return createTransaction({
          userId: ctx.user.id,
          ...input,
        });
      }),

    list: protectedProcedure
      .input(
        z.object({
          startDate: z.date().optional(),
          endDate: z.date().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        return getTransactions(ctx.user.id, input.startDate, input.endDate);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return getTransactionById(input.id, ctx.user.id);
      }),

    update: protectedProcedure
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
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        return updateTransaction(id, ctx.user.id, data);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return deleteTransaction(input.id, ctx.user.id);
      }),
  }),

  // Dashboard
  dashboard: router({
    summary: protectedProcedure
      .input(
        z.object({
          month: z.number(),
          year: z.number(),
        })
      )
      .query(async ({ ctx, input }) => {
        return getDashboardSummary(ctx.user.id, input.month, input.year);
      }),
  }),

  // Google Sheets
  sheets: sheetsRouter,

  // Receipt OCR
  receipt: router({
    processImage: protectedProcedure
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
