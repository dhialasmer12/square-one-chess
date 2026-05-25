import { Router } from 'express';
import * as tournamentController from '../controllers/tournament.controller';
import { verifyToken } from '../middleware/auth.middleware';

const router = Router();

router.use(verifyToken);

router.post('/create', tournamentController.createTournament);
router.get('/active', tournamentController.listActive);
router.post('/:tournamentId/join', tournamentController.joinTournament);
router.get('/:tournamentId/bracket', tournamentController.getBracket);
router.get('/:tournamentId/matches', tournamentController.getMatches);
router.get('/:tournamentId/chat', tournamentController.getChat);
router.post('/:tournamentId/chat', tournamentController.postChat);

export default router;
