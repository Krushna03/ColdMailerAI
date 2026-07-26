import { models } from "../config/gemini.js";

const sanitizeAIError = (message) => {
  if (!message) return 'An unexpected error occurred during email generation. Please check your network and try again.';

  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('quota') || lowerMessage.includes('rate limit') || lowerMessage.includes('429')) {
    return 'The AI generation service is temporarily busy (rate limit or quota exceeded). Please wait a moment and try again.';
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

  if (lowerMessage.includes('not found') || lowerMessage.includes('404') || lowerMessage.includes('deprecated')) {
    return 'The AI service is experiencing configuration updates. Please try again.';
  }

  return 'The AI generation service encountered an issue. Please simplify your prompt or try again later.';
};

// Helper to execute Gemini generation with fallback support.
const executeWithFallback = async (executeFn) => {
  let lastError = null;

  for (const modelInfo of models) {
    try {
      console.log(`Attempting AI generation with model: ${modelInfo.name}`);
      const result = await executeFn(modelInfo.instance);

      if (!result || !result.response) {
        throw new Error('Invalid response from AI model');
      }

      const generatedText = result.response.text();

      if (!generatedText || typeof generatedText !== 'string' || !generatedText.trim()) {
        throw new Error('Empty or invalid response from AI model');
      }

      console.log(`AI generation succeeded with model: ${modelInfo.name}`);
      return {
        success: true,
        data: generatedText
      };
    } catch (error) {
      console.error(`GoogleGenerativeAI Service Error with model ${modelInfo.name}:`, error);
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
          statusCode: 500
        };
      }

      console.warn(`Fallback triggered: model ${modelInfo.name} failed. Trying next model...`);
    }
  }

  // If we reach here, all models have failed
  if (lastError) {
    const userFriendlyError = sanitizeAIError(lastError.message);
    const statusCode = (lastError.message?.includes('quota') || lastError.message?.includes('429') || lastError.message?.includes('rate limit')) ? 503 : 500;

    return {
      success: false,
      error: userFriendlyError,
      statusCode
    };
  }

  return {
    success: false,
    error: 'All AI models failed to generate content.',
    statusCode: 500
  };
};

export const generateAIContent = async (prompt) => {
  return executeWithFallback((modelInstance) =>
    modelInstance.generateContent({
      contents: [
        {
          parts: [{ text: prompt }]
        },
      ],
    })
  );
};

export const generateAIContentWithRole = async (prompt, role = 'user') => {
  return executeWithFallback((modelInstance) =>
    modelInstance.generateContent({
      contents: [
        {
          role,
          parts: [{ text: prompt }]
        },
      ],
    })
  );
};

