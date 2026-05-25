import { Router } from 'express';
import * as aiController from '../controllers/ai.controller';
import { verifyToken } from '../middleware/auth.middleware';

const router = Router();

router.use(verifyToken);

router.post('/predict-move', aiController.predictMove);
router.post('/estimate-skill', aiController.estimateSkill);
router.post('/recommend-lessons', aiController.recommendLessons);
router.post('/lesson-puzzles', aiController.lessonPuzzles);
router.get('/game-review/:gameId', aiController.gameReview);

export default router;
