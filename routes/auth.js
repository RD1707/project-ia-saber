// routes/auth.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { userRegistrationRules, userLoginRules, validate } = require('../middlewares/validator');

router.post('/register', userRegistrationRules(), validate, authController.register);
router.post('/login', userLoginRules(), validate, authController.login);

module.exports = router;