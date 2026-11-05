import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

const InvoiceSchema = z.object({
  invoice_number: z.string(),
  vendor: z.string(),
  date: z.string(),
  subtotal: z.number(),
  tax: z.number(),
  total: z.number(),
})

async function main(): Promise<void> {
  const invoiceText = `
    Invoice Number: 1024
    Vendor: ABC Technologies
    Date: 2 November 2026
    Subtotal: 10000
    Tax: 1800
    Total: 11800
  `;

  const receivedInvoice = await extractInvoice(invoiceText);
  console.log("Validated Invoice Data:", receivedInvoice);


}

async function extractInvoice(invoiceText: string): Promise<z.infer<typeof InvoiceSchema>>{

try {
    const interaction = await retry(
      () => ai.interactions.create({
    model: "gemini-3.5-flash-lite",
  
    system_instruction: "You are an invoice data extraction assistant. Always respond in a concise and structured manner.",
  
    input: invoiceText,
    response_format: {
      type: "text",
      mime_type: "application/json",
    },
    })
    ,4)
  
    if(interaction.output_text === undefined) {
      throw new Error("No output text received from the AI interaction.");
    }
    
    const usage = interaction.usage;

    if(usage){
      const cost = calculateCost(
        usage.total_input_tokens ?? 0,
        usage.total_output_tokens ?? 0
      )
      console.log("Token Usage:", usage);
      console.log("Extraction Cost: $", cost.toFixed(8));
    }

    const extractedData = JSON.parse(interaction.output_text);



    const validatedSchema = InvoiceSchema.parse(extractedData);

    return validatedSchema
} catch (error) {
  console.log("Error:", error);
  console.log("Error name:", error instanceof Error ? error.name : "Unknown");
  console.log("Error message:", error instanceof Error ? error.message : error);
  console.log("Error status:", 
    typeof error === "object" && error !== null && "status" in error
      ? error.status
      : "No status"
  );

  throw error;
}

}

main().catch(console.error);

// Retry function to handle transient errors
async function retry<T>(
  fn: () => Promise<T>,
  attempts: number
): Promise<T> {

for (let i = 1; i <= attempts; i++) {

  try {
    const result = await fn();
    return result;

  } catch (error) {

    if (i === attempts || !isRetryable(error)) {
      throw error;
    }

    const delay = 1000 * Math.pow(2, i - 1);


    await new Promise<void>(resolve =>
      setTimeout(resolve, delay)
    );
  }
}

  throw new Error("Retry failed");
}

// Retry function to determine if an error is retryable based on its status code
function isRetryable(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  if (!("status" in error)) {
    return false;
  }

  const status = error.status;

  if (typeof status !== "number") {
    return false;
  }

  return [429, 500, 502, 503, 504].includes(status);
}



const PRICING = {
  input: 1,  // USD per 1 million tokens
  output: 2, // USD per 1 million tokens
};

function calculateCost(inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens * PRICING.input) / 1_000_000;
  const outputCost = (outputTokens * PRICING.output) / 1_000_000;

  return inputCost + outputCost;
}