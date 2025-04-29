const express = require('express');
const router = express.Router();
const VendorData = require('../models/VendorData');

// GET all vendor data
router.get('/getVendorData', async (req, res) => {
  try {
    const vendorData = await VendorData.find();
    res.status(200).json(vendorData);
  } catch (err) {
    console.error("Error getting vendor data:", err);
    res.status(500).json({ message: "Error getting vendor data" });
  }
});

module.exports = router;