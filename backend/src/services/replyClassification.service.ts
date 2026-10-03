import { generateAIContent } from "./ai.service.js";
import {
  ReplyCategory,
  ReplySentiment,
  IReplyClassification,
} from "../models/InboundEmail.model.js";

export interface ClassifyReplyParams {
  subject: string;
  body: string;
  fromEmail?: string;
  outboundSubject?: string;
  outboundBody?: string;
}

/**
 * Heuristic rule-based classifier providing instant, resilient classification
 * if LLM is offline, quota-limited, or in local test suites.
 */
export function heuristicReplyClassifier(
  subject: string = "",
  body: string = ""
): IReplyClassification {
  const combined = `${subject} ${body}`.toLowerCase();

  // 1. Out of Office / Auto-Reply
  if (
    /out of (the )?office|automatic reply|auto-reply|autoreply|away from (my )?desk|on vacation|maternity leave|paternity leave|annual leave/i.test(
      combined
    )
  ) {
    return {
      category: "out_of_office",
      sentiment: "neutral",
      confidence: 0.95,
      summary: "Automated out of office or vacation response.",
      suggestedAction: "Pause cadence and set follow-up after prospect returns.",
      classifiedAt: new Date(),
    };
  }

  // 2. Unsubscribe / Opt-Out
  if (
    /unsubscribe|remove me|opt[ -]out|stop emailing|please remove|do not contact|delete (my|our) (email|info|data)|cease/i.test(
      combined
    )
  ) {
    return {
      category: "unsubscribe",
      sentiment: "negative",
      confidence: 0.98,
      summary: "Prospect requested to be unsubscribed from all communications.",
      suggestedAction: "Immediately stop all sequences and add to suppression list.",
      classifiedAt: new Date(),
    };
  }

  // 3. Meeting Request / Booking
  if (
    /calendly\.com|hubspot\.com\/meetings|schedule a (call|meeting|time|chat)|book a time|let's (hop on|jump on) a call|free (this|next) (monday|tuesday|wednesday|thursday|friday|week)|how about (at )?\d{1,2}(:\d{2})?\s*(am|pm)?/i.test(
      combined
    )
  ) {
    return {
      category: "meeting_request",
      sentiment: "positive",
      confidence: 0.92,
      summary: "Prospect proposed a meeting time or shared calendar booking link.",
      suggestedAction: "Confirm calendar invite immediately and review prospect company profile.",
      classifiedAt: new Date(),
    };
  }

  // 4. Interested / Buying Intent
  if (
    /interested|tell me more|send (over )?(more|some) (info|details|pricing)|what (are|is) the pricing|sounds good|love to learn more|share a deck|share a demo|let's discuss|can you send|would like to see/i.test(
      combined
    )
  ) {
    return {
      category: "interested",
      sentiment: "positive",
      confidence: 0.88,
      summary: "Prospect expressed interest in your product or requested pricing/details.",
      suggestedAction: "Send tailored overview deck and offer a personalized 15-minute demo.",
      classifiedAt: new Date(),
    };
  }

  // 5. Wrong Person / Referral
  if (
    /wrong person|not the right (person|contact)|reach out to|talk to|speak with|no longer with|left the company|try contacting/i.test(
      combined
    )
  ) {
    return {
      category: "wrong_person",
      sentiment: "neutral",
      confidence: 0.85,
      summary: "Recipient indicated they are not the appropriate stakeholder for this offering.",
      suggestedAction: "Identify the referred contact and update lead assignment.",
      classifiedAt: new Date(),
    };
  }

  // 6. Objection / Timing / Competitor
  if (
    /already use|already have|currently using|too expensive|no budget|not right now|check back in|next quarter|next year|bad timing|under contract/i.test(
      combined
    )
  ) {
    return {
      category: "objection",
      sentiment: "negative",
      confidence: 0.82,
      summary: "Prospect presented an objection (budget, existing vendor, or timing).",
      suggestedAction: "Acknowledge objection and propose a soft check-in next quarter.",
      classifiedAt: new Date(),
    };
  }

  // 7. Not Interested
  if (
    /not interested|no thank you|no thanks|pass on this|not a fit|not looking/i.test(
      combined
    )
  ) {
    return {
      category: "not_interested",
      sentiment: "negative",
      confidence: 0.86,
      summary: "Prospect explicitly stated they are not interested.",
      suggestedAction: "Halt cadence and record feedback in lead notes.",
      classifiedAt: new Date(),
    };
  }

  // Default: Neutral
  return {
    category: "neutral",
    sentiment: "neutral",
    confidence: 0.6,
    summary: "Reply received with general commentary or inquiry.",
    suggestedAction: "Review message content and craft an individual follow-up.",
    classifiedAt: new Date(),
  };
}

/**
 * AI-powered reply classification leveraging LLM with robust JSON extraction
 * and seamless fallback to heuristic rules.
 */
export async function classifyEmailReplyService({
  subject,
  body,
  fromEmail = "",
  outboundSubject = "",
  outboundBody = "",
}: ClassifyReplyParams): Promise<IReplyClassification> {
  const prompt = `You are an expert enterprise sales AI analyzing an inbound email reply to a cold outreach campaign.

OUTBOUND EMAIL SENT:
Subject: ${outboundSubject || "(Unknown Subject)"}
Content: ${outboundBody.slice(0, 500) || "(Initial sequence pitch)"}

INBOUND REPLY RECEIVED:
From: ${fromEmail}
Subject: ${subject}
Body:
${body}

Analyze the reply and classify it into exactly one of these categories:
- "interested": Prospect shows interest, asks questions, requests pricing/deck/info.
- "meeting_request": Prospect wants to schedule a call, provides times, or shares Calendly/booking link.
- "objection": Prospect mentions competitors, budget constraints, timing ("check next quarter"), or contract.
- "out_of_office": Automated vacation, leave, or auto-reply.
- "wrong_person": Prospect refers to another colleague or states they are not the right person.
- "not_interested": Explicit rejection, not interested, no thanks.
- "unsubscribe": Requests to be removed, opted out, or unsubscribed.
- "neutral": General question, ambiguous statement, or acknowledgment.

Return ONLY a valid JSON object without markdown fences, with these exact keys:
{
  "category": "interested" | "meeting_request" | "objection" | "out_of_office" | "wrong_person" | "not_interested" | "unsubscribe" | "neutral",
  "sentiment": "positive" | "negative" | "neutral",
  "confidence": number between 0.0 and 1.0,
  "summary": "1 concise sentence summarizing what the prospect said",
  "suggestedAction": "1 concise actionable next step for the sales representative"
}`;

  try {
    const aiRes = await generateAIContent(prompt);
    if (aiRes.success && aiRes.data) {
      let cleaned = aiRes.data.trim();
      if (cleaned.startsWith("```json")) {
        cleaned = cleaned.replace(/^```json\s*/, "").replace(/```$/, "").trim();
      } else if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```\s*/, "").replace(/```$/, "").trim();
      }

      const parsed = JSON.parse(cleaned);
      if (parsed.category) {
        return {
          category: parsed.category.toLowerCase() as ReplyCategory,
          sentiment: (parsed.sentiment || "neutral").toLowerCase() as ReplySentiment,
          confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0.8)),
          summary: parsed.summary || "",
          suggestedAction: parsed.suggestedAction || "",
          classifiedAt: new Date(),
        };
      }
    }
  } catch (err) {
    console.warn("[ReplyClassification] LLM parsing failed, using heuristic fallback:", err);
  }

  // Resilient heuristic rule-based classification fallback
  return heuristicReplyClassifier(subject, body);
}
