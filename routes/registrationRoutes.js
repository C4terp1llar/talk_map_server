const express = require('express');
const router = express.Router();

const RegistrationController = require('../controllers/registrationController');

router.post('/checkEmail', RegistrationController.isEmailBusy);
router.post('/sendCheckCode', RegistrationController.sendCheckCode);
router.post('/verifyCheckCode', RegistrationController.verifyCheckCode);
router.post('/getCitiesByQ', RegistrationController.getCities);
router.post('/registerUser', RegistrationController.registerUser);
router.post('/changePassword', RegistrationController.changeUserPassword);

router.get('/getCommonAvatars', RegistrationController.getCommonAvatars);

module.exports = router;