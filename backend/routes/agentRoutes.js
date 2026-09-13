const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agentController');

const { optionalAuth, authenticateToken, requireRole } = require('../middleware/auth');

router.get('/queue', optionalAuth, agentController.getAgentQueue);
router.get('/verify/:token', optionalAuth, agentController.verifyToken);
router.post('/process-entry', optionalAuth, agentController.processEntry);
router.post('/reject-entry', optionalAuth, agentController.rejectEntry);

module.exports = router;
