const express = require("express");
const router = express.Router();

const client = require("../helpers/redis.js");

// Route for dashboard
router.get('/', async function (req, res) {
  
    // Get the class data from Redis
    const classData = await client.get("classData");

    // Render the dashboard using EJS
    res.render('dashboard', {
        classData: JSON.parse(classData) || {} // Pass the class data to the EJS rendering engine for the dashboard
    })
  });

module.exports = router;
