const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agentController');

router.get('/queue', agentController.getAgentQueue);
router.get('/verify/:token', agentController.verifyToken);
router.post('/process-entry', agentController.processEntry);
router.post('/reject-entry', agentController.rejectEntry);

module.exports = router;
