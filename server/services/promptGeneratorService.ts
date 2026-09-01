import OpenAI from "openai";
import { openaiClientOptions } from "../openai-env";

function createOpenAIClient(): OpenAI {
  return new OpenAI({
    ...openaiClientOptions(),
  });
}

export async function generateBrollPrompts(script: string, topic: string): Promise<string[]> {
  const client = createOpenAIClient();

  const systemPrompt = `You are a cinematic B-roll director. Given a video script and topic, generate exactly 6 detailed visual scene descriptions suitable for AI image generation. Each description should be a single paragraph describing a cinematic shot with specific visual details including lighting, camera angle, mood, and composition.

The 6 scenes should follow the emotional arc of the script:
- Scenes 1-2: Struggle/problem phase — darker, tense, or somber visuals
- Scenes 3-4: Discovery/turning point — transitional lighting, curiosity, exploration
- Scenes 5-6: Hope/resolution — bright, uplifting, optimistic visuals

Return ONLY a JSON array of exactly 6 strings. No other text, no markdown formatting.`;

  const userPrompt = `Topic: ${topic}

Script:
${script}

Generate 6 cinematic B-roll scene descriptions for this script.`;

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.8,
    max_tokens: 2000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response received from OpenAI for B-roll prompt generation");
  }

  let prompts: string[];
  try {
    prompts = JSON.parse(content);
  } catch {
    throw new Error("Failed to parse B-roll prompts response as JSON");
  }

  if (!Array.isArray(prompts) || prompts.length !== 6) {
    throw new Error(`Expected exactly 6 B-roll prompts, got ${Array.isArray(prompts) ? prompts.length : "non-array"}`);
  }

  if (!prompts.every((p) => typeof p === "string")) {
    throw new Error("All B-roll prompts must be strings");
  }

  return prompts;
}
