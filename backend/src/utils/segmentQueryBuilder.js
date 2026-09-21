export const escapeRegex = (str) => {
  return typeof str === 'string' ? str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') : '';
};

/**
 * Builds a dynamic MongoDB query from a segment query definition / filter payload.
 * Keeps segments 100% dynamic without storing static lead IDs.
 */
export const buildMongoQueryFromSegment = (filters = {}, { workspaceId, userId } = {}) => {
  const scope = workspaceId
    ? { $or: [{ workspaceId }, { userId }] }
    : { userId };

  const query = { ...scope };

  const andClauses = [];

  // Job title / role filter (matches jobTitle or legacy role)
  if (Array.isArray(filters.jobTitle) && filters.jobTitle.length > 0) {
    const titleRegexes = filters.jobTitle
      .map(escapeRegex)
      .filter(Boolean)
      .map((t) => new RegExp(t, 'i'));
    
    if (titleRegexes.length > 0) {
      andClauses.push({
        $or: [
          { jobTitle: { $in: titleRegexes } },
          { role: { $in: titleRegexes } }
        ]
      });
    }
  }

  // Industry filter
  if (Array.isArray(filters.industry) && filters.industry.length > 0) {
    const indRegexes = filters.industry
      .map(escapeRegex)
      .filter(Boolean)
      .map((ind) => new RegExp(`^${ind}$`, 'i'));
    
    if (indRegexes.length > 0) {
      andClauses.push({ 'company.industry': { $in: indRegexes } });
    }
  }

  // Company size filter
  if (Array.isArray(filters.companySize) && filters.companySize.length > 0) {
    andClauses.push({ 'company.size': { $in: filters.companySize } });
  }

  // Status filter
  if (Array.isArray(filters.status) && filters.status.length > 0) {
    andClauses.push({ status: { $in: filters.status } });
  }

  // Tags filter
  if (Array.isArray(filters.tags) && filters.tags.length > 0) {
    andClauses.push({ tags: { $in: filters.tags } });
  }

  // Category ID filter
  if (filters.categoryId) {
    andClauses.push({ categoryId: filters.categoryId });
  }

  // Assigned To filter
  if (filters.assignedTo) {
    andClauses.push({ assignedTo: filters.assignedTo });
  }

  // Source filter
  if (Array.isArray(filters.source) && filters.source.length > 0) {
    andClauses.push({ source: { $in: filters.source } });
  }

  // Location filter
  if (Array.isArray(filters.location) && filters.location.length > 0) {
    const locRegexes = filters.location
      .map(escapeRegex)
      .filter(Boolean)
      .map((loc) => new RegExp(loc, 'i'));
    
    if (locRegexes.length > 0) {
      andClauses.push({ location: { $in: locRegexes } });
    }
  }

  // Last contacted before (explicit date or relative days ago)
  // e.g. "All CEOs in SaaS companies who haven't been contacted in 7 days."
  if (filters.lastContactedDaysAgo !== undefined && filters.lastContactedDaysAgo !== null) {
    const days = Number(filters.lastContactedDaysAgo);
    
    if (!Number.isNaN(days) && days >= 0) {
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      andClauses.push({
        $or: [
          { lastActivityAt: { $lt: cutoff } },
          { lastActivityAt: null }
        ]
      });
    }
  } 
  else if (filters.lastContactedBefore) {
    const cutoff = new Date(filters.lastContactedBefore);
    
    if (!Number.isNaN(cutoff.getTime())) {
      andClauses.push({
        $or: [
          { lastActivityAt: { $lt: cutoff } },
          { lastActivityAt: null }
        ]
      });
    }
  }

  // Next follow-up before
  if (filters.nextFollowUpBefore) {
    const cutoff = new Date(filters.nextFollowUpBefore);
    
    if (!Number.isNaN(cutoff.getTime())) {
      andClauses.push({ nextFollowUpAt: { $lte: cutoff, $ne: null } });
    }
  }

  // Has email filter
  if (filters.hasEmail === true) {
    andClauses.push({ email: { $type: 'string', $gt: '' } });
  } 
  else if (filters.hasEmail === false) {
    andClauses.push({ $or: [{ email: '' }, { email: null }] });
  }

  // Has phone filter
  if (filters.hasPhone === true) {
    andClauses.push({ phone: { $type: 'string', $gt: '' } });
  } 
  else if (filters.hasPhone === false) {
    andClauses.push({ $or: [{ phone: '' }, { phone: null }] });
  }

  // Custom fields key-value matching
  if (filters.customFields && typeof filters.customFields === 'object') {
    for (const [key, value] of Object.entries(filters.customFields)) {
      if (value !== undefined && value !== null && value !== '') {
        andClauses.push({ [`customFields.${key}`]: value });
      }
    }
  }

  // Search keyword across name, email, company, job title, tags
  if (filters.search && typeof filters.search === 'string') {
    const escaped = escapeRegex(filters.search.trim());
    if (escaped) {
      andClauses.push({
        $or: [
          { name: { $regex: escaped, $options: 'i' } },
          { email: { $regex: escaped, $options: 'i' } },
          { 'company.name': { $regex: escaped, $options: 'i' } },
          { jobTitle: { $regex: escaped, $options: 'i' } },
          { role: { $regex: escaped, $options: 'i' } },
          { tags: { $regex: escaped, $options: 'i' } }
        ]
      });
    }
  }

  if (andClauses.length > 0) {
    query.$and = andClauses;
  }

  return query;
};
