const express = require('express');
const router = express.Router();
const centerController = require('../controllers/centerController');

router.get('/', centerController.getAllCenters);
router.get('/:id/slots', centerController.getCenterSlots);

module.exports = router;
