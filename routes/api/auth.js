const express = require('express');
const router = express.Router();


const { asyncHandler } = require('../../utils/index');

const AuthController = require('../../controllers/api/auth/auth.controller');

const { validateLogin, validateRegister } = require('../../validators/auth.validator');

router.post('/login', validateLogin, asyncHandler(AuthController.login));
router.post('/register', validateRegister, asyncHandler(AuthController.register));
// router.get('/verify', asyncHandler(AuthController.verifyEmail));
router.post('/logout', asyncHandler(AuthController.logout));
router.post('/resend-verification', asyncHandler(AuthController.resendVerification));
router.post('/request-reset-password', asyncHandler(AuthController.requestResetPassword));
router.post('/reset-password', asyncHandler(AuthController.resetPassword));

module.exports = router;
