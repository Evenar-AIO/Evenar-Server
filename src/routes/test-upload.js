const express = require('express');
const router = express.Router();

router.post('/', (req, res) => {
  console.log('Test Upload Hit!');
  res.status(200).json({ 
    success: true, 
    data: { 
      url: 'https://via.placeholder.com/150',
      public_id: 'test' 
    } 
  });
});

module.exports = router;
