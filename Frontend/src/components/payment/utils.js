export const formatPrice = (amount = 0, currency = 'USD') => {
  const major = amount / 100;
  if (currency === 'USD') {
    return major.toLocaleString('en-US', {
      minimumFractionDigits: Number.isInteger(major) ? 0 : 2,
      maximumFractionDigits: 2,
    });
  }
  return major.toLocaleString('en-IN', {
    minimumFractionDigits: Number.isInteger(major) ? 0 : 2,
    maximumFractionDigits: 2,
  });
};

export const formatPlanAmount = (amount = 0, currency = 'USD') => {
  if (!amount) return 'Free';
  const symbol = currency === 'USD' ? '$' : currency === 'INR' ? '₹' : `${currency} `;
  return `${symbol}${formatPrice(amount, currency)}`;
};

export const formatDate = (date) =>
  date
    ? new Date(date).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    : '--';

export const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const getDaysUntil = (date) => {
  if (!date) return null;
  const diff = new Date(date).getTime() - Date.now();
  if (Number.isNaN(diff)) return null;
  return Math.ceil(diff / DAY_IN_MS);
};

export const formatDaysLabel = (days) => {
  if (days === null || typeof days === 'undefined') return '--';
  if (days <= 0) return 'Expired';
  return `${days} day${days === 1 ? '' : 's'}`;
};
