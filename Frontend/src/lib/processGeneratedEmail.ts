import {
  extractEmailAndContent,
  validateExtraction,
  sanitizeEmailResponse,
} from "./extractEmail";
import { ProcessedEmail } from "../types/email";

export const processGeneratedEmail = (rawResponse?: string | null): ProcessedEmail => {
  // First sanitize the AI response to better match expected format
  const sanitizedResponse = sanitizeEmailResponse(rawResponse);

  // Then extract the email and content sections
  const { email, content } = extractEmailAndContent(sanitizedResponse);

  // Optionally validate the extraction for quality control
  const validation = validateExtraction({ email, content });

  return { email, content, isValid: validation.isValid };
};

export const formatBulletPoints = <T extends string | null | undefined>(content: T): T => {
  if (!content) return content;

  let formattedContent = content as string;

  // Convert asterisk bullet points to proper bullet points
  formattedContent = formattedContent.replace(/^\s*\*\s+/gm, "• ");

  // Fix bold formatting - change *emphasized text* to **bold text**
  formattedContent = formattedContent.replace(/\**([^*\n]+)\**/g, "$1");

  return formattedContent as T;
};
