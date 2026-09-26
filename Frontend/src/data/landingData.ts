export interface NavigationLink {
  label: string;
  target: string;
  offset: number;
}

export const navigationLinks: NavigationLink[] = [
  { label: "Features", target: "features", offset: -80 },
  { label: "Pricing", target: "pricing", offset: -80 },
  { label: "Testimonials", target: "testimonials", offset: -80 },
  { label: "Faqs", target: "faqs", offset: -80 },
  { label: "Contact", target: "contact", offset: -80 },
];

export interface Feature {
  title: string;
  description: string;
  iconPath: string;
}

export const features: Feature[] = [
  {
    title: "Instant Email Generation",
    description: "Quickly generate professional cold emails tailored to your goals, whether you're reaching out for sales, networking, job applications, or collaborations.",
    iconPath: "M16 5H8a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2zm0 0l-4 4m0 0l-4-4m4 4V3",
  },
  {
    title: "Context-Aware Writing",
    description: "Our AI understands your input and customizes the tone, structure, and message to fit your purpose, audience, and intent.",
    iconPath: "M12 20h9m-9 0H3m9 0V4m0 0L8 8m4-4l4 4",
  },
  {
    title: "Personalization Inputs",
    description: "Add key details about your recipient or company and let the AI craft emails that feel human, relevant, and specific.",
    iconPath: "M5.121 17.804A13.937 13.937 0 0112 15c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z",
  },
  {
    title: "Tone Customization",
    description: "Whether you want to sound friendly, formal, persuasive, or direct, you can adjust the tone to match your brand or style.",
    iconPath: "M9.75 17a2.25 2.25 0 104.5 0m-4.5 0h4.5m4.5-5.25a2.25 2.25 0 10-4.5 0 2.25 2.25 0 004.5 0zM3.75 11.75a2.25 2.25 0 104.5 0 2.25 2.25 0 00-4.5 0z",
  },
  {
    title: "One-Click Copy & Export",
    description: "Easily copy your generated email or export it for your CRM, email platform, or outreach tools with a single click.",
    iconPath: "M8 16h8m-4-4h4m-4-4h4m-4-4h4M4 6h.01M4 10h.01M4 14h.01M4 18h.01",
  },
  {
    title: "Unlimited Revisions",
    description: "Not happy with the first draft? Instantly regenerate or edit your cold email until it's just right—no limits.",
    iconPath: "M4 4v5h.582M20 20v-5h-.581M20 4l-4.35 4.35M4 20l4.35-4.35M20 4a9 9 0 00-12.73 0L4 7.27M4 20a9 9 0 0012.73 0L20 16.73",
  },  
];
