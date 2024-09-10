const express = require('express');
const router = express.Router();

const RegistrationController = require('../controllers/RegistrationController');

router.post('/checkEmail', RegistrationController.isEmailBusy);
router.post('/sendCheckCode', RegistrationController.sendCheckCode);
router.post('/verifyCheckCode', RegistrationController.verifyCheckCode);

module.exports = router;