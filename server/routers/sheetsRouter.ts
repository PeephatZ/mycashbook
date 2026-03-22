import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { formatTransactionsForSheets, generateCSVContent } from "../googleSheets";
import { saveSheetsExport } from "../db";

export const sheetsRouter = router({
  /**
   * Export transactions to CSV format
   * User can download and import to Google Sheets manually
   */
  exportToCSV: protectedProcedure.query(async ({ ctx }) => {
    try {
      const csvContent = await generateCSVContent(ctx.user.id);
      const filename = `cashbook_${new Date().toISOString().split("T")[0]}.csv`;

      return {
        success: true,
        data: {
          content: csvContent,
          filename,
          mimeType: "text/csv;charset=utf-8",
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "ไม่สามารถส่งออกข้อมูลได้",
      };
    }
  }),

  /**
   * Get export history
   */
  getExportHistory: protectedProcedure.query(async ({ ctx }) => {
    try {
      // In a real implementation, you would query the database
      // For now, return empty array
      return {
        success: true,
        data: [],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "ไม่สามารถดึงประวัติการส่งออกได้",
      };
    }
  }),

  /**
   * Record export to sheets
   */
  recordExport: protectedProcedure
    .input(
      z.object({
        spreadsheetId: z.string(),
        spreadsheetUrl: z.string().url(),
        recordCount: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        await saveSheetsExport({
          userId: ctx.user.id,
          spreadsheetId: input.spreadsheetId,
          spreadsheetUrl: input.spreadsheetUrl,
          recordCount: input.recordCount,
        });

        return {
          success: true,
          message: "บันทึกการส่งออกสำเร็จ",
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "ไม่สามารถบันทึกการส่งออกได้",
        };
      }
    }),
});
