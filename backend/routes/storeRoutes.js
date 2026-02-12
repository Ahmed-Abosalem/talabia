// ────────────────────────────────────────────────
// 📁 backend/routes/storeRoutes.js
// مسارات المتاجر في نظام طلبية (Talabia)
// ────────────────────────────────────────────────

import express from 'express';
import {
  createStore,
  getMyStore,
  updateStore,
} from '../controllers/storeController.js';
import { protect } from '../middleware/authMiddleware.js';
import { allowRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.post('/', protect, allowRoles('seller'), createStore);
router.get('/my', protect, allowRoles('seller'), getMyStore);
router.put('/my', protect, allowRoles('seller'), updateStore);

export default router;

// ────────────────────────────────────────────────
// ✅ كل بائع يدير متجره الخاص فقط.
// ✅ يمنع المستخدمين الآخرين من التعديل.
// ────────────────────────────────────────────────
