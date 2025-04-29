const express = require('express');
const router = express.Router();
const CompData = require('../models/CompanyData');

// GET all company data
router.get('/getCompData', async (req, res) => {
  try {
    const compData = await CompData.find();
    res.status(200).json(compData);
  } catch (err) {
    console.error("Error getting company data:", err);
    res.status(500).json({ message: "Error getting company data" });
  }
});

module.exports = router;
