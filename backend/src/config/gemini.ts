import "../loadEnv.js";
import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import { SYSTEM_PROMPT } from "../constants/email.prompts.js";

const geminiapiKey = process.env.GEMINIAPIKEY || "";
const genAI = new GoogleGenerativeAI(geminiapiKey);

// Active Google Gemini models
const MODEL_NAMES = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-3.1-flash-lite-preview",
];

const MODELS_WITH_THINKING_OFF = new Set(["gemini-2.5-flash"]);

const createModelInstance = (modelName: string): GenerativeModel => {
  const generationConfig: any = {
    maxOutputTokens: 2048,
    temperature: 0.3,
  };

  // 2.5 Flash enables dynamic thinking by default — disable for latency.
  if (MODELS_WITH_THINKING_OFF.has(modelName)) {
    generationConfig.thinkingConfig = { thinkingBudget: 0 };
  }

  return genAI.getGenerativeModel(
    {
      model: modelName,
      systemInstruction: SYSTEM_PROMPT,
      generationConfig,
    },
    { timeout: 20000 }
  );
};

export interface ModelEntry {
  name: string;
  instance: GenerativeModel;
}

export const models: ModelEntry[] = MODEL_NAMES.map((name) => ({
  name,
  instance: createModelInstance(name),
}));
