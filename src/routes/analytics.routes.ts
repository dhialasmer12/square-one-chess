import { Router } from 'express';
import * as analyticsController from '../controllers/analytics.controller';
import { verifyToken } from '../middleware/auth.middleware';
import { requireAdmin, requireAdminOrSelf } from '../middleware/admin.middleware';

const router = Router();

router.use(verifyToken);

router.get('/platform', requireAdmin, analyticsController.getPlatform);
router.get('/games', requireAdmin, analyticsController.getGames);
router.get(
  '/user/:userId',
  requireAdminOrSelf('userId'),
  analyticsController.getUser
);

export default router;
