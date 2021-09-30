import { Router } from 'express';

import Pages from './page';
const pages = new Pages();

const router = Router();

router.get('/account',                          	pages.account.bind(pages));

export default router;