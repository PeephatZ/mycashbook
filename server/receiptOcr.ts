import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";

export interface ReceiptOCRResult {
  amount: string;
  description: string;
  category: string;
  date: string;
  confidence: number;
  rawText: string;
}

/**
 * Process receipt image using AI Vision to extract transaction data
 */
export async function processReceiptImage(imageUrl: string): Promise<ReceiptOCRResult> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `คุณเป็นผู้ช่วยในการอ่านใบเสร็จ กรุณาวิเคราะห์รูปภาพใบเสร็จและส่งคืนข้อมูลในรูปแบบ JSON ที่มีโครงสร้างดังนี้:
{
  "amount": "จำนวนเงินทั้งหมด (ตัวเลขเท่านั้น เช่น 150.50)",
  "description": "รายละเอียดของรายการ (เช่น ค่าอาหาร ค่าน้ำมัน)",
  "category": "หมวดหมู่ (เช่น ค่าอาหาร, ค่าเดินทาง, ค่าสาธารณูปโภค, ค่าบันเทิง, ค่าสุขภาพ)",
  "date": "วันที่ในรูปแบบ YYYY-MM-DD",
  "confidence": "ความมั่นใจในการอ่าน (0-100)",
  "rawText": "ข้อความที่อ่านได้จากใบเสร็จ"
}

หากไม่สามารถอ่านข้อมูลได้ชัดเจน ให้ส่งค่า confidence ต่ำ`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "กรุณาอ่านใบเสร็จนี้และส่งคืนข้อมูลในรูปแบบ JSON",
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "high",
              },
            },
          ] as any,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "receipt_data",
          strict: true,
          schema: {
            type: "object",
            properties: {
              amount: {
                type: "string",
                description: "จำนวนเงิน",
              },
              description: {
                type: "string",
                description: "รายละเอียด",
              },
              category: {
                type: "string",
                description: "หมวดหมู่",
              },
              date: {
                type: "string",
                description: "วันที่ในรูปแบบ YYYY-MM-DD",
              },
              confidence: {
                type: "number",
                description: "ความมั่นใจ 0-100",
              },
              rawText: {
                type: "string",
                description: "ข้อความดิบ",
              },
            },
            required: ["amount", "description", "category", "date", "confidence", "rawText"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from LLM");
    }

    const contentStr = typeof content === "string" ? content : JSON.stringify(content);
    const result = JSON.parse(contentStr);
    return {
      amount: result.amount || "0",
      description: result.description || "",
      category: result.category || "อื่น ๆ",
      date: result.date || new Date().toISOString().split("T")[0],
      confidence: result.confidence || 0,
      rawText: result.rawText || "",
    };
  } catch (error) {
    console.error("Error processing receipt:", error);
    throw new Error("ไม่สามารถอ่านใบเสร็จได้");
  }
}

/**
 * Upload receipt image to storage
 */
export async function uploadReceiptImage(file: Buffer, filename: string): Promise<string> {
  const key = `receipts/${Date.now()}-${filename}`;
  const { url } = await storagePut(key, file, "image/jpeg");
  return url;
}
