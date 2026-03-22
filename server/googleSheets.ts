import { getTransactions } from "./db";

/**
 * Format transactions data for Google Sheets export
 */
export async function formatTransactionsForSheets(userId: number) {
  const transactions = await getTransactions(userId);

  // Prepare headers
  const headers = [
    "วันที่",
    "ประเภท",
    "หมวดหมู่",
    "รายละเอียด",
    "จำนวนเงิน",
    "หมายเหตุ",
    "วันที่บันทึก",
  ];

  // Prepare data rows
  const rows = transactions.map((tx: any) => [
    new Date(tx.transactionDate).toLocaleDateString("th-TH"),
    tx.type === "income" ? "รายรับ" : "รายจ่าย",
    tx.categoryId?.toString() || "-",
    tx.description || "-",
    parseFloat(tx.amount).toFixed(2),
    tx.notes || "-",
    new Date(tx.createdAt).toLocaleDateString("th-TH"),
  ]);

  return {
    headers,
    rows,
    sheetName: `บัญชีรายรับรายจ่าย_${new Date().toLocaleDateString("th-TH")}`,
  };
}

/**
 * Generate CSV content from transactions
 */
export async function generateCSVContent(userId: number): Promise<string> {
  const { headers, rows } = await formatTransactionsForSheets(userId);

  // Add BOM for UTF-8 encoding (required for Excel to display Thai correctly)
  const bom = "\uFEFF";

  // Create CSV content
  const csvContent = [
    headers.join(","),
    ...rows.map((row: any) => row.map((cell: any) => `"${cell}"`).join(",")),
  ].join("\n");

  return bom + csvContent;
}

/**
 * Generate Google Sheets API request body
 */
export function generateSheetsRequestBody(data: {
  headers: string[];
  rows: (string | number)[][];
  sheetName: string;
}) {
  return {
    properties: {
      title: `บัญชีรายรับรายจ่าย ${new Date().toLocaleDateString("th-TH")}`,
    },
    sheets: [
      {
        properties: {
          sheetId: 0,
          title: data.sheetName,
          gridProperties: {
            rowCount: data.rows.length + 1,
            columnCount: data.headers.length,
          },
        },
        data: [
          {
            rowData: [
              // Header row
              {
                values: data.headers.map(header => ({
                  userEnteredValue: {
                    stringValue: header,
                  },
                  userEnteredFormat: {
                    backgroundColor: {
                      red: 0.2,
                      green: 0.2,
                      blue: 0.2,
                    },
                    textFormat: {
                      foregroundColor: {
                        red: 1,
                        green: 1,
                        blue: 1,
                      },
                      bold: true,
                    },
                  },
                })),
              },
              // Data rows
              ...data.rows.map((row: any) => ({
                values: row.map((cell: any) => ({
                  userEnteredValue: {
                    stringValue: String(cell),
                  },
                })),
              })),
            ],
            range: {
              sheetId: 0,
              dimension: "ROWS",
            },
          },
        ],
      },
    ],
  };
}
