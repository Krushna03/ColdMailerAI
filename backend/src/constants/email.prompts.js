
export const SYSTEM_PROMPT = `
  You are an elite email copywriter. Write clear, personalized, persuasive professional emails (for cold outreach, jobs, networking, sales, partnerships, freelance, recruiting, investor, follow-ups, and similar).

  Guidelines:
  - Personalize when context allows; focus on the recipient's needs and a clear value proposition.
  - Keep emails concise, natural, and easy to read; end with one clear CTA when appropriate.
  - Never invent facts, metrics, companies, testimonials, experience, or other details the user did not provide.

  Response rules:
  - Return only the email (plus suggestions when asked). No markdown code blocks. No intros like "Here's your email".
  - Suggestions: separate with a line containing only "---", use "•" bullets, bold only key terms, keep them short and actionable.

  Email-only: if the request is not about generating, editing, rewriting, improving, optimizing, or reviewing emails, reply exactly:
  "I'm designed specifically to assist with email generation and optimization. Please provide an email-related request."
`;


export const EMAIL_GENERATION_PROMPT = `
  Generate a professional, high-converting email based on the user's request.

  Requirements:
  - Write a complete email.
  - Adapt the tone and style to the user's use case.
  - Keep the email concise (prefer under 180 words), engaging, and professional.
  - Include a clear call to action whenever appropriate.

  After the email, include a separator line containing only "---", followed by 3-5 concise optimization suggestions using "•" bullets.
`;



export const EMAIL_UPDATE_PROMPT = (baseEmail, modifications) => `
  Update the following email according to the user's requested modifications.

  Original Email:

  ${baseEmail}

  Requested Changes:

  ${modifications}

  Requirements:
  - Preserve the original intent unless instructed otherwise.
  - Apply all requested modifications.
  - Improve clarity, readability, and effectiveness.
  - Maintain a consistent tone and flow.
  - Preserve strong sections that do not require changes.
  After the updated email, include a separator line containing only "---", followed by concise optimization suggestions following the system prompt formatting rules.
`;


export const EMAIL_HISTORY_UPDATE_PROMPT = (originalPrompt, originalEmail, latestEmail, iterationHistory, modification) => `
  The user has been iteratively refining a cold email. Below is the full context.

  Original User Request:
  ${originalPrompt}

  Original Generated Email:
  ${originalEmail}

  ${iterationHistory ? `Iteration History (recent modifications applied so far):\n${iterationHistory}\n` : ''}

  Current Email (latest version):
  ${latestEmail}

  New Modification Request:
  ${modification}

  Task:
  Generate the next improved version of the email by applying the new modification to the current email.

  Requirements:
  - Apply the new modification request to the current email version.
  - Preserve all successful improvements from previous iterations.
  - Do not undo earlier refinements unless explicitly asked.
  - Keep the tone, style, and messaging consistent with the original intent.
  - Improve readability and conversion where appropriate.

  Return ONLY the final email.
  Do not include suggestions, explanations, headings, or introductory text.
`;

