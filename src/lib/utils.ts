/**
 * Formats a date string or object to 'Month DD, YYYY'
 * e.g., 'May 23, 2026'
 */
export function formatDate(date: string | Date | undefined): string {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) return 'N/A';

  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Calculates the expiry date based on plan name
 */
export function calculateExpiryDate(startDate: Date, planName: string): string {
  const d = new Date(startDate);
  const plan = planName.toLowerCase();
  
  if (plan.includes('lite')) {
    d.setMonth(d.getMonth() + 1);
  } else if (plan.includes('plus')) {
    d.setMonth(d.getMonth() + 3);
  } else if (plan.includes('pro')) {
    d.setMonth(d.getMonth() + 6);
  } else if (plan.includes('elite')) {
    d.setFullYear(d.getFullYear() + 1);
  } else {
    d.setMonth(d.getMonth() + 1); // Default to 1 month
  }

  return d.toISOString().split('T')[0];
}
