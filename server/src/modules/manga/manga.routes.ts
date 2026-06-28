import { Router } from 'express';
import { MangaController } from './manga.controller';

const router = Router();
const controller = new MangaController();

router.get('/search', controller.search);
router.get('/:id', controller.getDetails);
router.get('/:id/chapters', controller.getChapters);
router.get('/chapter/:chapterId', controller.getPages);

export default router;
