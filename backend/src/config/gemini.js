import '../loadEnv.js';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { SYSTEM_PROMPT } from "../constants/email.prompts.js";

const geminiapiKey = process.env.GEMINIAPIKEY;
const genAI = new GoogleGenerativeAI(geminiapiKey);

// Fastest models first.
const MODEL_NAMES = [
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash",
  "gemini-2.5-flash",
  "gemini-3.5-flash",
  "gemini-2.5-pro",
];

const MODELS_WITH_THINKING_OFF = new Set(["gemini-2.5-flash"]);

const createModelInstance = (modelName) => {
  const generationConfig = {
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
    { timeout: 5000 }
  );
};

export const models = MODEL_NAMES.map((name) => ({
  name,
  instance: createModelInstance(name),
}));