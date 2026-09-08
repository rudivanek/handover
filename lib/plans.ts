export const PLAN_LIMITS: Record<string, number | null> = {
  free: 1,
  freelancer: 3,
  agency: null,
};

export const PLAN_LABELS: Record<string, { en: string; es: string }> = {
  free: { en: 'Free', es: 'Gratis' },
  freelancer: { en: 'Freelancer', es: 'Freelancer' },
  agency: { en: 'Agency', es: 'Agencia' },
};
