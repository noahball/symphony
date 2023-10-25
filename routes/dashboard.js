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

// Route for managing a class
router.get('/manage', async function (req, res) {
  
  if (!req.query.class) {
    return res.status(400).send("Please provide a class.")
  }

  // Get the class data from Redis
  const classStr = await client.get("classData");
  const classData = JSON.parse(classStr);
  const studentsStr = await client.get("studentsData");
  const studentsData = JSON.parse(studentsStr);
  const teachersStr = await client.get("teachersData");
  const teachersData = JSON.parse(teachersStr);
  const subjectsStr = await client.get("subjectsData");
  const subjectsData = JSON.parse(subjectsStr);

  // Substitute subject and teacher codes for names

  classData[req.query.class].code = subjectsData[ classData[req.query.class].code].name;
  classData[req.query.class].teacher = teachersData[classData[req.query.class].teacher].name;

  // Substitute student IDs for names

  for (var i = 0; i < classData[req.query.class].students.length; i++) {
    classData[req.query.class].students[i] = studentsData[classData[req.query.class].students[i]].name;
  }

  const thisClass = classData[req.query.class];

  res.render("manage", {
    classShort: req.query.class,
    classData: thisClass
  })

});

module.exports = router;
