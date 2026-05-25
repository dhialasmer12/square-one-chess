import { Router } from 'express';
import * as gameController from '../controllers/game.controller';
import { verifyToken } from '../middleware/auth.middleware';

const router = Router();

router.use(verifyToken);

router.post('/create', gameController.createGamePost);
router.post('/bot', gameController.createBotGame);
router.get('/history/:userId', gameController.getGameHistoryPaginated);
router.get('/user/:userId/history', gameController.getProfileHistory);
router.get('/user/:userId/recent', gameController.getRecentGames);
router.get('/user/:userId', gameController.getUserGames);

router.get('/:gameId/board', gameController.getBoard);
router.get('/:gameId/moves', gameController.getHistory);
router.get('/:gameId/valid-moves', gameController.getValidMovesForSquare);
router.get('/:gameId/pgn', gameController.getPgn);
router.get('/:gameId/status', gameController.getStatus);
router.post('/:gameId/move', gameController.submitMove);
router.post('/:gameId/resign', gameController.resignGame);
router.get('/:gameId', gameController.getGameSession);

export default router;
