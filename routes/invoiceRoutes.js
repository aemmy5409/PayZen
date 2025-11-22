import express from 'express';
import { createInvoice, getInvoices, getInvoiceSummary} from '../controller/invoiveController.js';
import { limitByIP } from '../middleware/rateLimiter.js'; 
import { protectRoute } from '../middleware/auth.js';

const router = express.Router();

router.post('/invoices', limitByIP, protectRoute, createInvoice);
router.get('/invoices', limitByIP, protectRoute, getInvoices);
router.get('/invoices/summary', limitByIP, protectRoute, getInvoiceSummary);

export default router;