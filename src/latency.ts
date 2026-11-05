import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

async function main() {
  console.time("Gemini API Latency");

  const response = await ai.interactions.create({
    model: "gemini-3.5-flash-lite",
    input: "What is 2 + 2? Answer in one sentence."
  });

  console.timeEnd("Gemini API Latency");

  console.log("Response:", response.output_text);
}

main().catch(console.error);