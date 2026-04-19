import express from 'express';
const router = express.Router();
import * as userController from '../controllers/userController.js';
import authMiddleware from '../middleware/auth.js';

// Allroutes are protected
router.use(authMiddleware);

router.get('/profile', userController.getUserProfile);
router.put('/profile', userController.updateProfile);
router.put('/preferences', userController.updateUserPreferences);
router.put('/change-password', userController.changePassword);
router.delete('/account', userController.deleteUserAccount);

export default router;