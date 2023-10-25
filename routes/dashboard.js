const express = require("express");
const router = express.Router();

const {google} = require('googleapis');

const client = require("../helpers/redis.js");

// Route for dashboard
router.get('/', async function (req, res) {
  
    // Get the class data from Redis
    const classDataStr = await client.get("classData");
    const classData = JSON.parse(classDataStr);

    // Get the excluded classes data from Redis
    const exclClassesStr = await client.get("exclClasses");
    const exclClasses = JSON.parse(exclClassesStr);

    // Get the excluded subjects data from Redis
    const exclSubjectsStr = await client.get("exclSubjects");
    const exclSubjects = JSON.parse(exclSubjectsStr);

    // Mark any excluded classes/subjects as excluded
    for (const [key, value] of Object.entries(classData)) { // For every class
      if (exclClasses.names.includes(key)) { // If class name is in excluded array
        classData[key].excluded = true; // Mark as excluded
      } else if (exclSubjects.subjects.includes(value.code)) { // If class code is in excluded array
        classData[key].excluded = true; // Mark as excluded
      } else {
        classData[key].excluded = false; // Don't mark as excluded
      }
    }
    
    // Render the dashboard using EJS
    res.render('dashboard', {
        classData: classData || {} // Pass the class data to the EJS rendering engine for the dashboard
    })
  });

// Route for managing a class
router.get('/manage', async function (req, res) {
  
  if (!req.query.class) { // If no class provided to manage
    return res.status(400).send("Please provide a class.")
  }

  // Get the class data from Redis
  const classStr = await client.get("classData");
  const classData = JSON.parse(classStr);
  // Get student data from Redis
  const studentsStr = await client.get("studentsData");
  const studentsData = JSON.parse(studentsStr);
  // Get teacher data from Redis
  const teachersStr = await client.get("teachersData");
  const teachersData = JSON.parse(teachersStr);
  // Get subjects data from Redis
  const subjectsStr = await client.get("subjectsData");
  const subjectsData = JSON.parse(subjectsStr);

  // If the class doesn't exist
  if(!classData[req.query.class]) {
    return res.status(404).send("Class not found.")
  }

  // Substitute subject and teacher codes for names
  // BUG FIX: Some classes don't have a teacher or code, prevent crashes and log error if they don't
  try {
    classData[req.query.class].code = subjectsData[classData[req.query.class].code].name;
    classData[req.query.class].teacher = teachersData[classData[req.query.class].teacher].name;
  } catch (err) {
    console.log(err)
  }

  // Substitute student IDs for names
  for (var i = 0; i < classData[req.query.class].students.length; i++) {
    classData[req.query.class].students[i] = studentsData[classData[req.query.class].students[i]].name;
  }

  // Get just this class's object
  const thisClass = classData[req.query.class];

  res.render("manage", { // Render manage page with EJS
    classShort: req.query.class, // Retain short/DB class name from query string
    classData: thisClass
  })

});

router.get('/manage/exclude-class', async function (req, res) {
  if (!req.query.class) { // If no class query is provided
    return res.status(400).send("Please provide a class.") // Tell the user
  }

  const exclClassesStr = await client.get("exclClasses"); // Get excluded classes from Redis
  if (!exclClassesStr) { // If there have (never) been any excluded classes
    var exclClasses = { names: [] }; // Create an empty object
  } else {
    var exclClasses = JSON.parse(exclClassesStr); // Parse the class data
  }

  if (!exclClasses.names.includes(req.query.class)) { // If this class has not already been excluded
    exclClasses.names.push(req.query.class); //  Added it to excluded classes array
    client.set("exclClasses", JSON.stringify(exclClasses)); // Push to Redis
  }

  res.redirect('/manage?class=' + req.query.class) // Redirect user back to manage page
})

// Exclude a subject from being pushed to Classroom
router.get('/manage/exclude-subject', async function (req, res) {
  // If no subject query is provided
  if (!req.query.subject) {
    return res.status(400).send("Please provide a subject.")
  }

  // Get excluded subjects from Redis
  const exclSubjectsStr = await client.get("exclSubjects");
  if (!exclSubjectsStr) { // No excluded subjects (ever)
    var exclSubjects = { subjects: [] }; // Create an empty object
  } else {
    var exclSubjects = JSON.parse(exclSubjectsStr); // Parse the subject data
  }

  // Class data from Redis
  const classStr = await client.get("classData");
  const classData = JSON.parse(classStr);

  // Find the subject code for the class provided
  const subjectCode = classData[req.query.subject].code;

  if (!exclSubjects.subjects.includes(subjectCode)) { // If the subject hasn't already been excluded
    exclSubjects.subjects.push(subjectCode); // Add it to the list of excluded subjects
    client.set("exclSubjects", JSON.stringify(exclSubjects)); // Save the new excluded subjects object to Redis
  }

  res.redirect('/manage?class=' + req.query.subject) // Redirect back to the class management page
})

// Push to Google Classroom
router.get('/push', async function (req, res) {

  // Import classroom module
  const classroom = google.classroom({version: 'v1', auth});

  // Get the class data from Redis
  const classStr = await client.get("classData");
  const classData = JSON.parse(classStr);

  // Get student data from Redis
  const studentsStr = await client.get("studentsData");
  const studentsData = JSON.parse(studentsStr);

  // Get teacher data from Redis
  const teachersStr = await client.get("teachersData");
  const teachersData = JSON.parse(teachersStr);

  // Get subject data from Redis
  const subjectsStr = await client.get("subjectsData");
  const subjectsData = JSON.parse(subjectsStr);

  // Get the excluded classes data from Redis
  const exclClassesStr = await client.get("exclClasses");
  var exclClasses = JSON.parse(exclClassesStr);

  // Get the excluded subjects data from Redis
  const exclSubjectsStr = await client.get("exclSubjects");
  var exclSubjects = JSON.parse(exclSubjectsStr);

  for (const [key, value] of Object.entries(classData)) { // For each class
    if (!exclClasses.names.includes(key) && !exclSubjects.subjects.includes(value.code)) { // If the class isn't excluded or has an excluded subject code
      var res = await classroom.courses.create({ // Create the class
        name: `${subjectsData[classData[key].code].name} (${classData[key].line}) with ${teachersData[classData[key].teacher].name} `, // "eg. Year 12 Mathematics with Calculus (3) with Mr F Graham"
        ownerId: teachersData[classData[key].teacher].email, // Set teacher as owner
        courseState: "PROVISIONED" // Set course state to provisioned (available)
      })

      var courseId = res.data.id; // Get the ID of the created course

      var res = await classroom.courses.teachers.create({ // Add the teacher as a teacher
        courseId: courseId, // Use course ID
        userId: teachersData[classData[key].teacher].email // Use teacher email
      })

      for (var i = 0; i < classData[key].students.length; i++) { // For each student in this class
        var res = await classroom.courses.students.create({ // Add them to the classroom
          courseId: courseId,
          userId: studentsData[classData[key].students[i]].email // Student's email
        })
      }

    }
  }
})

module.exports = router;
