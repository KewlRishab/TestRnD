const express = require('express');
const router = express.Router();
const CustData = require('../models/CustomerData');

// GET all customer data
router.get('/getCustData', async (req, res) => {
  try {
    const custData = await CustData.find();
    res.status(200).json(custData);
  } catch (err) {
    console.error("Error getting customer data:", err);
    res.status(500).json({ message: "Error getting customer data" });
  }
});

module.exports = router;
