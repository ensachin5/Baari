import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth-guard.js';
import { sendDigestEmail } from '../services/resend.js';

export const devRouter = Router();

// Dev endpoint for triggering weekly digest email manually
devRouter.post('/send-digest', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (process.env.NODE_ENV === 'production') {
    res.status(403).json({ error: 'Dev endpoints are disabled in production' });
    return;
  }

  const user = req.user!;
  const success = await sendDigestEmail(
    { name: user.name, email: user.email },
    { completedTasks: 8, pendingTasks: 2, totalExpenses: 1450 }
  );

  res.json({ message: 'Digest email trigger processed', success });
});
