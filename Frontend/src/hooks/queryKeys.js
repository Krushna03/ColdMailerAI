// Centralized React Query key factory so cache reads/writes/invalidations stay
export const queryKeys = {
  userCount: ["userCount"],
  currentUser: ["currentUser"],
  planUsage: ["planUsage"],
  email: (id) => ["email", id],
  emailHistory: (userId) => ["emailHistory", userId],
  paymentPlans: ["paymentPlans"],
  paymentHistory: ["paymentHistory"],
  communityTemplates: ["communityTemplates"],
  leads: (page) => ["leads", page],
  leadsAll: ["leads"],
  lead: (id) => ["lead", id],
  leadCategories: ["leadCategories"],
};
