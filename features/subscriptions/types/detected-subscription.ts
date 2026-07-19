import { z } from 'zod';

export const detectedSubscriptionSchema = z.object({
  service_name: z.string().trim().min(1).max(100),
  amount: z.number().finite().min(0).max(999999999),
  currency: z.string().regex(/^[A-Z]{3}$/),
  renewal_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  billing_cycle: z.enum(['monthly', 'yearly', 'trial']),
  confidence: z.number().min(0).max(1),
  warnings: z.array(z.string().max(200)).max(5),
});

export type DetectedSubscription = z.infer<typeof detectedSubscriptionSchema>;
export type DetectionMethod = 'email' | 'screenshot';