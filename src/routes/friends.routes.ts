import { Router } from 'express';
import * as friendController from '../controllers/friend.controller';
import { verifyToken } from '../middleware/auth.middleware';

const router = Router();

router.use(verifyToken);

router.post('/request', friendController.sendRequest);
router.put('/:requestId', friendController.respond);
router.get('/', friendController.list);
router.delete('/:friendId', friendController.remove);

export default router;
