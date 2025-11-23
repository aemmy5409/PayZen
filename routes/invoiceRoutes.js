import express from 'express';
import { createInvoice, downloadInvoice, getInvoices, getInvoiceSummary, uploadLogo} from '../controller/invoiveController.js';
import { limitByIP } from '../middleware/rateLimiter.js'; 
import { protectRoute } from '../middleware/auth.js';
import {upload, validateImageFile} from '../multer/multer.config.js';

const router = express.Router();

router.post('/invoices', limitByIP, protectRoute, createInvoice);
router.get('/invoices', limitByIP, protectRoute, getInvoices);
router.get('/invoices/summary', limitByIP, protectRoute, getInvoiceSummary);
router.get('/invoices/:id/download', limitByIP, protectRoute, downloadInvoice);
router.post('/invoices/upload-logo', limitByIP, protectRoute, upload, validateImageFile, uploadLogo);

export default router;