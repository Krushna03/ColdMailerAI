export interface ILeadDataContext {
  name: string;
  email: string;
  jobTitle?: string;
  role?: string;
  location?: string;
  linkedinUrl?: string;
  timezone?: string;
  notes?: string;
  tags?: string[];
  customFields?: Record<string, any>;
  categoryName?: string;
}

export interface ICompanyInfoContext {
  name: string;
  domain?: string;
  industry?: string;
  size?: string;
  revenue?: string;
  description?: string;
  techStack?: string;
  targetAudience?: string;
}

export interface ICampaignObjectiveContext {
  goal: string; // e.g. "Schedule a 15-minute product walkthrough"
  callToAction?: string; // e.g. "Are you free this Thursday at 2 PM?"
  valueProposition?: string; // e.g. "Increase inbox placement and reply rates by 3x"
  offer?: string; // e.g. "Complimentary cold deliverability audit"
}

export interface ISenderProfileContext {
  name: string;
  title: string;
  company: string;
  valueProposition?: string;
  bio?: string;
  meetingLink?: string;
  portfolioUrl?: string;
}

export interface IConversationMessage {
  direction: "outbound" | "inbound";
  subject: string;
  snippet: string;
  date?: Date | string;
  category?: string;
}

export interface IPreviousConversationContext {
  threadSummary?: string;
  lastInteractionType?: "sent_email" | "inbound_reply" | "none";
  lastContactedAt?: Date | string;
  history?: IConversationMessage[];
}

export interface ISequenceContext {
  sequenceName: string;
  sequenceDescription?: string;
  currentStepOrder: number;
  totalSteps: number;
  stepType?: "cold_outreach" | "follow_up" | "value_add" | "case_study" | "breakup" | "custom";
  stepTitle?: string;
  daysSinceLastStep?: number;
  overallStrategy?: string;
}

export interface ContextualEmailPromptParams {
  lead: ILeadDataContext;
  company: ICompanyInfoContext;
  campaignObjective: ICampaignObjectiveContext;
  tone: string;
  senderProfile: ISenderProfileContext;
  previousConversation?: IPreviousConversationContext;
  sequenceContext?: ISequenceContext;
  customInstructions?: string;
}

export function buildContextualEmailPrompt(params: ContextualEmailPromptParams): string {
  const {
    lead,
    company,
    campaignObjective,
    tone,
    senderProfile,
    previousConversation,
    sequenceContext,
    customInstructions,
  } = params;

  // 1. Format Lead Data
  const leadLines: string[] = [
    `- Full Name: ${lead.name}`,
    `- Email: ${lead.email}`,
    lead.jobTitle ? `- Job Title: ${lead.jobTitle}` : "",
    lead.role ? `- Role: ${lead.role}` : "",
    lead.location ? `- Location: ${lead.location}` : "",
    lead.categoryName ? `- Outreach Category: ${lead.categoryName}` : "",
    lead.notes ? `- Internal Notes / Context: ${lead.notes}` : "",
    lead.tags && lead.tags.length > 0 ? `- Tags: ${lead.tags.join(", ")}` : "",
  ].filter(Boolean);

  // 2. Format Company Information
  const companyLines: string[] = [
    `- Company Name: ${company.name}`,
    company.domain ? `- Domain: ${company.domain}` : "",
    company.industry ? `- Industry: ${company.industry}` : "",
    company.size ? `- Company Size: ${company.size}` : "",
    company.revenue ? `- Revenue Range: ${company.revenue}` : "",
    company.description ? `- Business Summary: ${company.description}` : "",
    company.techStack ? `- Tech Stack: ${company.techStack}` : "",
    company.targetAudience ? `- Target Audience: ${company.targetAudience}` : "",
  ].filter(Boolean);

  // 3. Format Campaign Objective
  const objectiveLines: string[] = [
    `- Primary Goal: ${campaignObjective.goal || "Start a conversation and gauge interest"}`,
    campaignObjective.callToAction ? `- Call to Action: ${campaignObjective.callToAction}` : "",
    campaignObjective.valueProposition ? `- Core Value Proposition: ${campaignObjective.valueProposition}` : "",
    campaignObjective.offer ? `- Specific Offer / Incentive: ${campaignObjective.offer}` : "",
  ].filter(Boolean);

  // 4. Format Sender Profile
  const senderLines: string[] = [
    `- Sender Name: ${senderProfile.name}`,
    `- Sender Title: ${senderProfile.title}`,
    `- Sender Company: ${senderProfile.company}`,
    senderProfile.valueProposition ? `- Sender Value Proposition: ${senderProfile.valueProposition}` : "",
    senderProfile.meetingLink ? `- Meeting / Calendar Link: ${senderProfile.meetingLink}` : "",
    senderProfile.bio ? `- Sender Background: ${senderProfile.bio}` : "",
  ].filter(Boolean);

  // 5. Format Previous Conversation
  let conversationText = "No previous interactions. This is the first touchpoint.";
  if (previousConversation && previousConversation.history && previousConversation.history.length > 0) {
    const historyLines = previousConversation.history.map((msg, idx) => {
      const dir = msg.direction === "outbound" ? "SENT BY SENDER" : "REPLY FROM PROSPECT";
      return `  [${idx + 1}] ${dir} (Subject: "${msg.subject}"): "${msg.snippet}"`;
    });
    conversationText = [
      previousConversation.threadSummary ? `Summary: ${previousConversation.threadSummary}` : "",
      previousConversation.lastContactedAt ? `Last Contacted: ${previousConversation.lastContactedAt}` : "",
      "Interaction History:\n" + historyLines.join("\n"),
    ].filter(Boolean).join("\n");
  }

  // 6. Format Sequence Context
  let sequenceText = "Stand-alone individual outreach.";
  if (sequenceContext) {
    sequenceText = [
      `- Campaign Name: ${sequenceContext.sequenceName}`,
      `- Cadence Step: Step ${sequenceContext.currentStepOrder} of ${sequenceContext.totalSteps}`,
      sequenceContext.stepType ? `- Step Classification: ${sequenceContext.stepType.toUpperCase()}` : "",
      sequenceContext.stepTitle ? `- Step Focus: ${sequenceContext.stepTitle}` : "",
      sequenceContext.daysSinceLastStep ? `- Days Since Prior Step: ${sequenceContext.daysSinceLastStep} days` : "",
      sequenceContext.overallStrategy ? `- Strategy: ${sequenceContext.overallStrategy}` : "",
    ].filter(Boolean).join("\n");
  }

  return `You are a world-class cold outreach copywriter and sales strategist.
Your task is to generate a hyper-personalized, high-converting cold email synthesized from 7 essential context pillars.

=== CONTEXT PILLAR 1: LEAD DATA ===
${leadLines.join("\n")}

=== CONTEXT PILLAR 2: COMPANY INFORMATION ===
${companyLines.join("\n")}

=== CONTEXT PILLAR 3: CAMPAIGN OBJECTIVE ===
${objectiveLines.join("\n")}

=== CONTEXT PILLAR 4: TONE & VOICE ===
Selected Tone: ${tone || "professional and conversational"}
(Ensure the email feels genuine, human, concise, and calibrated to this tone. Never sound robotic, spammy, or generic.)

=== CONTEXT PILLAR 5: SENDER PROFILE ===
${senderLines.join("\n")}

=== CONTEXT PILLAR 6: PREVIOUS CONVERSATION CONTEXT ===
${conversationText}

=== CONTEXT PILLAR 7: SEQUENCE CADENCE CONTEXT ===
${sequenceText}

${customInstructions ? `=== USER SPECIAL INSTRUCTIONS ===\n${customInstructions}\n` : ""}

=== CRITICAL COPYWRITING RULES ===
1. LENGTH: Keep email body concise (under 160 words). Prospects skim emails on mobile devices.
2. RELEVANCE: Connect the lead's specific role (${lead.jobTitle || lead.role || "stakeholder"}) and company (${company.name}) to the sender's value proposition naturally.
3. PREVIOUS CONTEXT: If this is Step 2+ or if there is previous interaction history, reference it smoothly without guilt-tripping ("Following up on my note last week..."). If it's Step 1, do NOT say "following up".
4. CALL TO ACTION: Include exactly ONE low-friction call-to-action (e.g. asking for 10 minutes, interest in a 2-minute video, or quick question).
5. AVOID BANNED WORDS: No "I hope this email finds you well", no "synergy", no "revolutionary", no deceptive clickbait.
6. NO HALLUCINATIONS: Do not fabricate specific numbers, fake testimonials, or company facts not mentioned above.

=== OUTPUT FORMAT ===
You MUST return ONLY a valid JSON object (no markdown fences, no explanatory prefix). The JSON must have these exact keys:
{
  "subject": "Compelling subject line (under 50 chars, personalized)",
  "alternativeSubjects": [
    "Alternative A/B subject variant 1",
    "Alternative A/B subject variant 2"
  ],
  "preheader": "35-50 characters preview text snippet that appears in inbox previews",
  "body": "The complete personalized email body formatted with clean line breaks (\\n\\n between paragraphs). Include a professional sign-off with sender name and company.",
  "callToAction": "The extracted single call-to-action question",
  "personalizationInsights": "A 1-2 sentence breakdown of how the 7 context layers were leveraged in this copy",
  "suggestedDelayDays": 3
}`;
}
