import { Router } from 'express';
import * as statsController from '../controllers/stats.controller';
import { verifyToken } from '../middleware/auth.middleware';

const router = Router();

router.use(verifyToken);

router.get('/leaderboard', statsController.getLeaderboard);
router.get('/top-winners', statsController.getTopWinners);
router.get('/user/:userId/elo-history', statsController.getEloHistory);
router.get('/user/:userId/rank', statsController.getUserRank);
router.get('/user/:userId', statsController.getUserStats);

export default router;
