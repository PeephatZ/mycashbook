import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { formatTransactionsForSheets, generateCSVContent } from "../googleSheets";
import { saveSheetsExport } from "../db";

// Use a fixed public user ID for public access (no authentication)
const PUBLIC_USER_ID = 1;

export const sheetsRouter = router({
  /**
   * Export transactions to CSV format
   * User can download and import to Google Sheets manually
   */
  exportToCSV: publicProcedure.query(async () => {
    try {
      const csvContent = await generateCSVContent(PUBLIC_USER_ID);
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
  getExportHistory: publicProcedure.query(async () => {
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
  recordExport: publicProcedure
    .input(
      z.object({
        spreadsheetId: z.string(),
        spreadsheetUrl: z.string().url(),
        recordCount: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        await saveSheetsExport({
          userId: PUBLIC_USER_ID,
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
