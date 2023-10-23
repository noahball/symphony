const express = require("express");
const router = express.Router();

// Route for dashboard
router.get('/', function (req, res) {
    // Class Data (TODO: from DB)
    const classData = {}

    // Render the dashboard using EJS
    res.render('dashboard', {
        classData: classData // Pass the class data to the EJS rendering engine for the dashboard
    })
  });

module.exports = router;
