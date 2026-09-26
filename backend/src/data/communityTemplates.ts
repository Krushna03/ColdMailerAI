export interface CommunityEmailTemplate {
  id: string;
  type: string;
  title: string;
  description: string;
  category: string;
  tone: string;
  audience: string;
  tags: string[];
  featured: boolean;
  subject: string;
  body: string;
}

export interface CommunityPromptTemplate {
  id: string;
  type: string;
  title: string;
  description: string;
  category: string;
  tone: string;
  tags: string[];
  featured: boolean;
  prompt: string;
  variables: string[];
}

export const emailTemplates: CommunityEmailTemplate[] = [
  {
    id: "email-saas-demo",
    type: "email",
    title: "SaaS demo outreach",
    description: "A concise, benefit-led introduction for booking a product demo.",
    category: "Sales",
    tone: "Confident",
    audience: "SaaS decision-makers",
    tags: ["B2B", "Demo", "SaaS"],
    featured: true,
    subject: "A faster way to handle {{pain_point}} at {{company}}",
    body: `Hi {{first_name}},

    I noticed {{company}} is growing its {{team_or_function}}. Teams at that stage often spend too much time on {{pain_point}}.

    {{product}} helps {{audience}} achieve {{key_outcome}} without {{common_tradeoff}}. One customer recently {{proof_point}}.

    Would a 15-minute walkthrough next week be useful? I can tailor it around how {{company}} handles {{workflow}} today.

    Best,
    {{sender_name}}`,
  },
  {
    id: "email-job-referral",
    type: "email",
    title: "Warm referral request",
    description: "Ask for a role referral while keeping the message specific and respectful.",
    category: "Job search",
    tone: "Warm",
    audience: "Employees at a target company",
    tags: ["Referral", "Career", "Networking"],
    featured: true,
    subject: "Quick question about {{role}} at {{company}}",
    body: `Hi {{first_name}},

    I came across your work on {{specific_project_or_post}} and appreciated your perspective on {{relevant_topic}}.

    I'm applying for the {{role}} position at {{company}}. My experience in {{relevant_skill}}—especially {{short_achievement}}—looks closely aligned with what the team needs.

    If you feel my background could be a fit, would you be comfortable referring me? No pressure at all; even one insight about the team would be valuable.

    Thank you,
    {{sender_name}}`,
  },
  {
    id: "email-link-building",
    type: "email",
    title: "Value-first link outreach",
    description: "Share a relevant resource without sounding like a generic backlink request.",
    category: "Marketing",
    tone: "Helpful",
    audience: "Content managers and editors",
    tags: ["SEO", "Content", "Partnership"],
    featured: false,
    subject: "Resource for your {{article_topic}} guide",
    body: `Hi {{first_name}},

    Your guide on {{article_topic}} stood out—especially the section about {{specific_detail}}.

    We recently published {{resource_description}}, which includes {{unique_value}}. It may be a useful addition for readers who want to {{reader_goal}}.

    Here it is: {{resource_url}}

    If it adds value, feel free to include it. Either way, thanks for putting together such a practical guide.

    Best,
    {{sender_name}}`,
  },
  {
    id: "email-partnership",
    type: "email",
    title: "Co-marketing partnership",
    description: "Propose a focused collaboration with a clear shared audience and outcome.",
    category: "Partnership",
    tone: "Collaborative",
    audience: "Brand and growth leaders",
    tags: ["Co-marketing", "Growth", "Brand"],
    featured: false,
    subject: "{{company_a}} × {{company_b}}: an idea for {{shared_audience}}",
    body: `Hi {{first_name}},

    I've been following {{company}}'s work in {{specific_area}}, and there seems to be a strong overlap between your audience and ours.

    I have a simple idea: {{collaboration_idea}}. We could combine {{your_strength}} with {{their_strength}} to help {{shared_audience}} achieve {{outcome}}.

    We would handle {{your_contribution}}, keeping the lift light for your team.

    Open to a short call to explore whether it makes sense?

    Cheers,
    {{sender_name}}`,
  },
  {
    id: "email-event-follow-up",
    type: "email",
    title: "Event follow-up",
    description: "Turn a brief conference conversation into a natural next step.",
    category: "Networking",
    tone: "Friendly",
    audience: "Event connections",
    tags: ["Follow-up", "Events", "Relationship"],
    featured: false,
    subject: "Great meeting you at {{event_name}}",
    body: `Hi {{first_name}},

    It was great meeting you at {{event_name}}. I enjoyed our conversation about {{conversation_topic}}, particularly your point about {{memorable_detail}}.

    You mentioned {{their_goal_or_challenge}}. This {{resource_or_idea}} might be useful: {{resource_link_or_summary}}.

    I'd be glad to continue the conversation over a quick coffee or call next week. Would {{suggested_time}} work?

    Best,
    {{sender_name}}`,
  },
  {
    id: "email-client-reactivation",
    type: "email",
    title: "Past client reactivation",
    description: "Reconnect around a new, relevant opportunity instead of sending a generic check-in.",
    category: "Sales",
    tone: "Personal",
    audience: "Previous customers",
    tags: ["Reactivation", "Customer", "Upsell"],
    featured: false,
    subject: "An idea for {{company}}'s next {{initiative}}",
    body: `Hi {{first_name}},

    I was thinking about the work we did together on {{past_project}} and the {{result}} your team achieved.

    Since then, we've developed {{new_capability}} for teams looking to {{current_goal}}. Given {{company}}'s focus on {{recent_priority}}, I thought it could be timely.

    Would you be open to a brief conversation? I can share two ideas specific to {{company}}—no formal pitch needed.

    Best,
    {{sender_name}}`,
  },
];

export const promptTemplates: CommunityPromptTemplate[] = [
  {
    id: "prompt-saas-demo",
    type: "prompt",
    title: "Personalized SaaS pitch",
    description: "Generate a researched cold email centered on one prospect problem.",
    category: "Sales",
    tone: "Confident",
    tags: ["B2B", "SaaS", "Personalization"],
    featured: true,
    prompt: `Write a concise cold email to {{recipient_name}}, {{recipient_role}} at {{company}}.

    My product, {{product_name}}, helps {{target_customer}} solve {{pain_point}} by {{how_it_works}}.

    Personalize the opening using this observation: {{prospect_observation}}.
    Use this proof point: {{proof_point}}.

    Keep it under {{word_limit}} words, use a confident but conversational tone, avoid buzzwords, and end with a low-friction question for a {{meeting_length}}-minute call. Include 3 short subject-line options.`,
    variables: ["recipient_name", "recipient_role", "company", "product_name", "target_customer", "pain_point", "how_it_works", "prospect_observation", "proof_point", "word_limit", "meeting_length"],
  },
  {
    id: "prompt-job-referral",
    type: "prompt",
    title: "Thoughtful referral ask",
    description: "Create a credible referral request grounded in role fit and genuine connection.",
    category: "Job search",
    tone: "Warm",
    tags: ["Career", "Referral", "Concise"],
    featured: true,
    prompt: `Draft a warm referral request to {{employee_name}}, who works as {{employee_role}} at {{company}}, for the open {{target_role}} position.

    Connection or reason for reaching out: {{connection_context}}.
    My most relevant experience: {{relevant_experience}}.
    One measurable achievement: {{achievement}}.
    Why this company and role interest me: {{motivation}}.

    Keep it between 90 and 130 words. Be specific, humble, and easy to decline. Do not exaggerate familiarity. End by asking either for a referral or one useful insight about the hiring team.`,
    variables: ["employee_name", "employee_role", "company", "target_role", "connection_context", "relevant_experience", "achievement", "motivation"],
  },
  {
    id: "prompt-follow-up",
    type: "prompt",
    title: "No-response follow-up",
    description: "Follow up without repeating the original pitch or creating pressure.",
    category: "Follow-up",
    tone: "Direct",
    tags: ["Sequence", "Sales", "Short"],
    featured: false,
    prompt: `Write a follow-up to the cold email below:

    {{original_email}}

    Add one new piece of value: {{new_insight_or_resource}}.
    The recipient's likely priority is {{recipient_priority}}.

    Use no more than 65 words. Do not say "just following up," "bumping this," or imply guilt. Briefly reconnect the value to their priority and end with a yes-or-no question.`,
    variables: ["original_email", "new_insight_or_resource", "recipient_priority"],
  },
  {
    id: "prompt-partnership",
    type: "prompt",
    title: "Partnership proposal",
    description: "Frame a balanced collaboration around mutual audience value.",
    category: "Partnership",
    tone: "Collaborative",
    tags: ["Brand", "Collaboration", "Win-win"],
    featured: false,
    prompt: `Write a partnership outreach email from {{my_company}} to {{partner_company}}.

    Their relevant work: {{relevant_work}}.
    Our shared audience: {{shared_audience}}.
    Partnership idea: {{partnership_idea}}.
    What we contribute: {{our_contribution}}.
    Likely benefit for them: {{partner_benefit}}.

    Open with a specific, genuine observation. Explain the idea in one clear paragraph, make the mutual value concrete, and propose a 20-minute exploratory call. Keep it under 150 words and avoid inflated claims.`,
    variables: ["my_company", "partner_company", "relevant_work", "shared_audience", "partnership_idea", "our_contribution", "partner_benefit"],
  },
  {
    id: "prompt-rewrite",
    type: "prompt",
    title: "Human-sounding rewrite",
    description: "Improve an existing draft while preserving its facts and intent.",
    category: "Editing",
    tone: "Natural",
    tags: ["Rewrite", "Clarity", "Conversion"],
    featured: false,
    prompt: `Rewrite the email below so it sounds natural, specific, and written by a thoughtful person:

    {{email_draft}}

    Target reader: {{target_reader}}.
    Desired action: {{desired_action}}.
    Preferred tone: {{preferred_tone}}.

    Preserve every factual claim. Remove clichés, filler, fake familiarity, and repeated ideas. Vary sentence length, keep paragraphs short, and keep the result under {{word_limit}} words. Return the revised subject and body only.`,
    variables: ["email_draft", "target_reader", "desired_action", "preferred_tone", "word_limit"],
  },
  {
    id: "prompt-event-follow-up",
    type: "prompt",
    title: "Memorable event follow-up",
    description: "Reconnect using details from a real conversation and offer a useful next step.",
    category: "Networking",
    tone: "Friendly",
    tags: ["Events", "Follow-up", "Relationship"],
    featured: false,
    prompt: `Write a follow-up email to {{person_name}} after meeting at {{event_name}}.

    What we discussed: {{conversation_topic}}.
    Memorable detail they shared: {{memorable_detail}}.
    Useful resource or idea I can offer: {{resource_or_idea}}.
    Preferred next step: {{next_step}}.

    Keep it friendly and professional, between 75 and 110 words. Make the conversation reference feel natural, not forced. Do not turn it into a sales pitch.`,
    variables: ["person_name", "event_name", "conversation_topic", "memorable_detail", "resource_or_idea", "next_step"],
  },
];

export const communityTemplateData = {
  emailTemplates,
  promptTemplates,
};
