import { models } from "../config/gemini.js";

const sanitizeAIError = (message) => {
  if (!message) return 'An unexpected error occurred during email generation. Please try again.';

  const lowerMessage = message.toLowerCase();
  
  if (
    lowerMessage.includes('quota') ||
    lowerMessage.includes('rate limit') ||
    lowerMessage.includes('429') ||
    lowerMessage.includes('resource exhausted')
  ) {
    return 'The AI generation service is temporarily unavailable. Please try again.';
  }
  
  if (
    lowerMessage.includes('api_key') || 
    lowerMessage.includes('api key') || 
    lowerMessage.includes('authentication') || 
    lowerMessage.includes('unauthorized') || 
    lowerMessage.includes('401') || 
    lowerMessage.includes('403')
  ) {
    return 'AI service authentication failed. Please contact support.';
  }

  if (
    lowerMessage.includes('not found') ||
    lowerMessage.includes('404') ||
    lowerMessage.includes('deprecated')
  ) {
    return 'The AI service is experiencing configuration updates. Please try again.';
  }

  return 'The AI generation service encountered an issue. Please simplify your prompt or try again later.';
};


export const isRateLimitError = (error) => {
  if (!error) return false;
  if (typeof error === 'object' && error.isRateLimit) return true;

  const status = error?.status || error?.statusCode;
  const message = (
    typeof error === 'string'
      ? error
      : error?.message || error?.error || ''
  ).toLowerCase();

  return (
    status === 429 ||
    message.includes('quota') ||
    message.includes('rate limit') ||
    message.includes('429') ||
    message.includes('resource exhausted') ||
    message.includes('resource_exhausted') ||
    message.includes('too many requests')
  );
};


// Helper to execute Gemini generation with fallback support.
const executeWithFallback = async (executeFn) => {
  let lastError = null;

  for (let i = 0; i < models.length; i++) {
    const modelInfo = models[i];
    try {
      console.log(`Attempting AI generation with model: ${modelInfo.name}`);
      const result = await executeFn(modelInfo.instance);

      if (!result || !result.response) {
        throw new Error("Invalid response from AI model");
      }

      const generatedText = result.response.text();

      if (!generatedText || typeof generatedText !== 'string' || !generatedText.trim()) {
        throw new Error('Empty or invalid response from AI model');
      }

      console.log(
        `AI generation succeeded with model: ${modelInfo.name}`
      );

      return {
        success: true,
        data: generatedText,
      };
    } catch (error) {
      lastError = error;

      // Unrecoverable authentication error - abort fallback loop
      if (
        error.message?.includes('API_KEY') || 
        error.message?.includes('authentication') ||
        error.message?.includes('401') ||
        error.message?.includes('403')
      ) {
        return {
          success: false,
          error: 'AI service authentication failed. Please contact support.',
          statusCode: 500,
          isRateLimit: false
        };
      }

      const rateLimited = isRateLimitError(error);
      if (rateLimited && i < models.length - 1) {
        console.warn(`Model ${modelInfo.name} rate limited (429/quota). Waiting 2s before trying fallback model...`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } else {
        console.warn(`Fallback triggered: model ${modelInfo.name} failed (${error.message}). Trying next model...`);
      }
    }
  }

  // If we reach here, all models have failed
  if (lastError) {
    const userFriendlyError = sanitizeAIError(lastError.message);
    const rateLimited = isRateLimitError(lastError);
    const statusCode = rateLimited ? 429 : 500;

    return {
      success: false,
      error: userFriendlyError,
      statusCode,
      isRateLimit: rateLimited
    };
  }

  return {
    success: false,
    error: "All AI models failed to generate content.",
    statusCode: 500,
    isRateLimit: false
  };
};


const buildParts = (text, images) => {
  const parts = [{ text }];

  if (images) {
    const imgArray = Array.isArray(images) ? images : [images];

    imgArray.forEach((img) => {
      if (img && img.mimeType && img.data) {
        parts.push({
          inlineData: {
            mimeType: img.mimeType,
            data: img.data,
          },
        });
      }
    });
  }
  return parts;
};


export const generateAIContent = async (prompt, images = null) => {
  return executeWithFallback((modelInstance) =>
    modelInstance.generateContent({
      contents: [
        {
          parts: buildParts(prompt, images),
        },
      ],
    })
  );
};


export const generateAIContentWithRole = async (prompt, role = 'user', images = null) => {
  return executeWithFallback((modelInstance) =>
    modelInstance.generateContent({
      contents: [
        {
          role,
          parts: buildParts(prompt, images),
        },
      ],
    })
  );
};

