const express = require('express');

const router = express.Router();

router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'User module is working'
  });
});

module.exports = router;
