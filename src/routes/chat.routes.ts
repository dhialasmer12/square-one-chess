import { Router } from 'express';
import * as chatController from '../controllers/chat.controller';
import { verifyToken } from '../middleware/auth.middleware';

const router = Router();

router.use(verifyToken);

router.get('/history', chatController.getHistory);

export default router;
