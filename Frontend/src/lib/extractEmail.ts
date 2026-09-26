import { ExtractionValidation } from "../types/email";

export const findSignatureEndIndex = (
  text: string,
  signatureMatch: RegExpMatchArray
): number => {
  const startIndex = signatureMatch.index ?? 0;
  const matchStr = signatureMatch[0];
  const postSignatureText = text.substring(startIndex + matchStr.length);

  const lines = postSignatureText.split("\n");
  let accumulatedLength = startIndex + matchStr.length;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Check if this line starts a bullet point or suggestions header
    const isRealBullet = /^[•*]\s+|^-\s+|^\d+[.)]\s+/.test(trimmedLine);
    const isSuggestionsHeader =
      /^(Additional Suggestions|Additional Content|Suggestions:|Explanation:|Additional notes:)/i.test(
        trimmedLine
      );

    if (isRealBullet || isSuggestionsHeader) {
      return accumulatedLength;
    }

    accumulatedLength += line.length + 1;
  }

  return text.length;
};

const cleanTrailingSeparators = (text?: string): string => {
  if (!text) return "";
  return text.replace(/[\s\-*_~=]+$/, "").trim();
};

export const extractEmailAndContent = (
  fullText?: string | null
): { email: string; content: string } => {
  // Handle empty or invalid input
  if (!fullText || typeof fullText !== "string") {
    return {
      email: "Something went wrong. Please try again.",
      content: "Please provide text containing an email and additional content.",
    };
  }

  const emailMarkers = [
    "Subject:",
    "subject:",
    "EMAIL:",
    "email:",
    "Subject line:",
    "SUBJECT:",
  ];

  // Look for the "---" separator first
  const separatorMatch = fullText.match(/\n---\s*\n/);
  if (separatorMatch && separatorMatch.index !== undefined) {
    const separatorIndex = separatorMatch.index;

    let emailStartIndex = -1;
    for (const marker of emailMarkers) {
      const index = fullText.indexOf(marker);
      if (index !== -1 && (emailStartIndex === -1 || index < emailStartIndex)) {
        emailStartIndex = index;
      }
    }

    const emailStart = emailStartIndex === -1 ? 0 : emailStartIndex;
    const email = fullText.substring(emailStart, separatorIndex);
    const content = fullText
      .substring(separatorIndex + separatorMatch[0].length)
      .trim();

    return { email: cleanTrailingSeparators(email), content };
  }

  // Define markers that separate email content from additional suggestions
  // Using more reliable markers that align with the system prompt
  const contentMarkers = [
    "Additional Suggestions",
    "Additional suggestions",
    "ADDITIONAL SUGGESTIONS",
    "Additional Content",
    "Additional content",
    "Here are some suggestions",
    "Here are some additional suggestions",
    "Some suggestions",
    "Some additional suggestions",
    "Suggestions:",
    "Explanation:",
    "Additional notes:",
  ];

  // Find the starting position of the email - use the first occurrence of any marker
  let emailStartIndex = -1;

  for (const marker of emailMarkers) {
    const index = fullText.indexOf(marker);
    if (index !== -1 && (emailStartIndex === -1 || index < emailStartIndex)) {
      emailStartIndex = index;
    }
  }

  // Find the starting position of the additional content
  let contentStartIndex = -1;

  for (const marker of contentMarkers) {
    const index = fullText.indexOf(marker);
    if (index !== -1 && (contentStartIndex === -1 || index < contentStartIndex)) {
      contentStartIndex = index;
    }
  }

  // Handle cases where markers aren't found
  if (emailStartIndex === -1) {
    // If no email markers found, try to intelligently split the content
    // Look for patterns like a greeting followed by paragraphs
    const greetingPatterns = /^(Hi|Hello|Dear|Greetings|Hey)/m;
    const greetingMatch = fullText.match(greetingPatterns);

    if (greetingMatch && greetingMatch.index !== undefined) {
      // Found a greeting, try to find where additional content might start
      const paragraphs = fullText.split(/\n\s*\n/);

      if (paragraphs.length > 1) {
        // Assume the last paragraph might be additional content
        const lastParagraphIndex = fullText.lastIndexOf(
          paragraphs[paragraphs.length - 1]
        );
        return {
          email: cleanTrailingSeparators(
            fullText.substring(0, lastParagraphIndex)
          ),
          content: paragraphs[paragraphs.length - 1].trim(),
        };
      } else {
        // If only one paragraph, just return everything as email
        return {
          email: cleanTrailingSeparators(fullText),
          content: "",
        };
      }
    } else {
      // No clear structure, return everything as email
      return {
        email: cleanTrailingSeparators(fullText),
        content: "",
      };
    }
  }

  // If no content marker is found, try to infer where content might begin
  if (contentStartIndex === -1) {
    // Strategy 1: Look for signature markers which might indicate email end
    const signaturePatterns =
      /\n(Best regards|Kind regards|Warm regards|Regards|Sincerely|Best|Thanks|Thank you|Cheers|Yours|With regards|Yours sincerely|Sincerely yours),?\s*\n/i;
    const signatureMatch = fullText
      .substring(emailStartIndex)
      .match(signaturePatterns);

    if (signatureMatch && signatureMatch.index !== undefined) {
      const signatureEndIndex =
        emailStartIndex +
        findSignatureEndIndex(
          fullText.substring(emailStartIndex),
          signatureMatch
        );
      // Check if there's still content after the signature
      if (signatureEndIndex < fullText.length - 20) {
        // Require at least 20 chars of content
        return {
          email: cleanTrailingSeparators(
            fullText.substring(emailStartIndex, signatureEndIndex)
          ),
          content: fullText.substring(signatureEndIndex).trim(),
        };
      }
    }

    // Strategy 2: If no signature found or insufficient content after signature,
    // return everything as email and show a placeholder for content
    return {
      email: cleanTrailingSeparators(fullText.substring(emailStartIndex)),
      content: "No additional suggestions found.",
    };
  }

  // Normal case: both markers found
  const email = fullText.substring(emailStartIndex, contentStartIndex);

  // Include the content marker in the content section
  const content = fullText.substring(contentStartIndex).trim();

  return { email: cleanTrailingSeparators(email), content };
};

// Helper function to check if the extraction worked correctly
export const validateExtraction = (result: {
  email: string;
  content: string;
}): ExtractionValidation => {
  const { email, content } = result;

  // Check if email contains basic expected elements
  const hasSubjectLine = /subject|subject line|re:/i.test(email);
  const hasGreeting = /hi|hello|dear|greetings|hey/i.test(email);
  const hasSignature =
    /regards|sincerely|thanks|thank you|best|cheers/i.test(email);
  const hasCallToAction =
    /call|contact|reach out|schedule|connect|meeting|discuss|next steps|response|reply|thoughts|follow up/i.test(
      email
    );

  // Check if content section contains expected elements based on system prompt
  const hasAdditionalSuggestions =
    /suggestion|tip|recommend|idea|consider|try|enhance|improve|optimize/i.test(
      content
    );
  const hasExplanations =
    /explain|clarif|understand|reason|because|detail|note|background|context/i.test(
      content
    );

  return {
    isValid: hasSubjectLine && hasGreeting && hasCallToAction, // Call to action required by system prompt
    hasMissingElements: {
      subjectLine: !hasSubjectLine,
      greeting: !hasGreeting,
      callToAction: !hasCallToAction,
      signature: !hasSignature,
      additionalContent: !hasAdditionalSuggestions && !hasExplanations,
    },
  };
};

// This helper function can be used to sanitize the AI response to better match expected format
export const sanitizeEmailResponse = <T extends string | null | undefined>(response: T): T => {
  // Don't process null or undefined responses
  if (!response) return response;

  // Replace phrases that explicitly introduce the email (per system prompt requirement)
  const phrasesToRemove = [
    "Here is your generated email:",
    "Here's your generated email:",
    "Here is the generated email:",
    "Here's the generated email:",
    "I've generated the following cold email:",
    "Your cold email is ready:",
    "The cold email you requested:",
  ];

  let sanitized: any = response;

  // Remove introduction phrases
  phrasesToRemove.forEach((phrase) => {
    if (sanitized.includes(phrase)) {
      sanitized = sanitized.replace(phrase, "").trim();
    }
  });

  // If there's already a "---" separator, we don't need to add any suggestions marker
  if (
    sanitized.includes("\n---\n") ||
    sanitized.includes("\n--- \n") ||
    sanitized.includes("\n---")
  ) {
    const formatBulletPoints = (text: string) => {
      const parts = text.split(/\n---\s*\n/);
      if (parts.length >= 2) {
        const emailPart = parts[0];
        let contentPart = parts.slice(1).join("\n---\n");

        // Clean up redundant headers at the start of suggestions
        contentPart = contentPart.replace(
          /^(Additional Suggestions|Additional Content|Suggestions:|Explanation:|Additional notes:)\s*\n*/i,
          ""
        );

        // Replace asterisk bullet points with proper bullet points
        contentPart = contentPart.replace(/^\s*\*\s+/gm, "• ");

        // Fix bold formatting - change *Title* to **Title**
        contentPart = contentPart.replace(/\*([^*\n]+)\*/g, "**$1**");

        return emailPart + "\n\n---\n\n" + contentPart;
      }
      return text;
    };

    sanitized = formatBulletPoints(sanitized);
    return sanitized as T;
  }

  const signatureRegex =
    /\n(Best regards|Kind regards|Warm regards|Regards|Sincerely|Best|Thanks|Thank you|Cheers|Yours|With regards|Yours sincerely|Sincerely yours),?\s*\n.+/is;

  if (
    !/(Additional Suggestions|Additional Content|Suggestions:|Explanation:|Additional notes:)/i.test(
      sanitized
    )
  ) {
    // Check if there's a signature followed by more content
    const signatureMatch = sanitized.match(signatureRegex);
    if (signatureMatch && signatureMatch.index !== undefined) {
      const signatureEndPos = findSignatureEndIndex(sanitized, signatureMatch);
      if (signatureEndPos < sanitized.length - 30) {
        // Ensure there's substantial content after
        const beforeContent = sanitized.substring(0, signatureEndPos);
        const afterContent = sanitized.substring(signatureEndPos);
        sanitized = beforeContent + "\n\n---\n\n" + afterContent;
      }
    }
  } else {
    // Format bullet points when a header is present
    const formatBulletPoints = (text: string) => {
      const sections = text.split(
        /(Additional Suggestions|Additional Content|Suggestions:|Explanation:|Additional notes:)/i
      );

      if (sections.length >= 3) {
        const emailPart = sections[0];
        let contentPart = sections.slice(2).join("");
        contentPart = contentPart.replace(/^\s*\*\s+/gm, "• ");
        contentPart = contentPart.replace(/\*([^*\n]+)\*/g, "**$1**");
        return emailPart.trim() + "\n\n---\n\n" + contentPart.trim();
      }
      return text;
    };
    sanitized = formatBulletPoints(sanitized);
  }

  return sanitized as T;
};
