import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  image: z.string().url().optional().or(z.literal('')),
});

export const registerPushTokenSchema = z.object({
  token: z.string().min(10),
  deviceType: z.enum(['ios', 'android', 'web']),
});
