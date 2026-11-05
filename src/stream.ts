import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!
});

async function main() {
  const stream = await ai.interactions.create({
    model: "gemini-3.5-flash-lite",
    input: "Explain how an API works in 200 words.",
    stream: true
  });

  let completed = false;

    try {
        for await (const event of stream) {
        if (
            event.event_type === "step.delta" &&
            event.delta.type === "text"
        ) {
            process.stdout.write(event.delta.text);
        }
        
        if (event.event_type === "interaction.completed") {
            completed = true;
            console.log("\n\nGeneration complete.");
        }
        
        if (!completed) {
        console.log("\n\nStream ended without completion event.");
        }

        }
    } catch (error) {
        console.error("\nStreaming failed:", error);
    }

}

main().catch(console.error);