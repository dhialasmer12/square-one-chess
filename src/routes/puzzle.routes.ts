import { Router } from 'express';
import * as puzzleController from '../controllers/puzzle.controller';
import { verifyToken } from '../middleware/auth.middleware';

const router = Router();

router.use(verifyToken);

router.get('/daily', puzzleController.getDaily);
router.get('/random', puzzleController.getRandom);
router.get('/stats', puzzleController.getStats);
router.get('/themes', puzzleController.getThemes);
router.get('/theme/:theme', puzzleController.getByTheme);
router.post('/:id/solve', puzzleController.postSolve);
router.get('/:id/hint', puzzleController.getHint);
router.get('/:id', puzzleController.getById);

export default router;
