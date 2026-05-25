import { Router } from 'express';
import aiRoutes from './ai.routes';
import authRoutes from './auth.routes';
import gameRoutes from './game.routes';
import statsRoutes from './stats.routes';
import tournamentRoutes from './tournament.routes';
import analyticsRoutes from './analytics.routes';
import friendsRoutes from './friends.routes';
import chatRoutes from './chat.routes';
import puzzleRoutes from './puzzle.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/games', gameRoutes);
router.use('/stats', statsRoutes);
router.use('/ai', aiRoutes);
router.use('/tournaments', tournamentRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/friends', friendsRoutes);
router.use('/chat', chatRoutes);
router.use('/puzzles', puzzleRoutes);

export default router;
