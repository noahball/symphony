// Noah Ball
// October 2023

// Imports
require("dotenv").config();
const express = require('express')

// Constants
const app = express()
const port = process.env.PORT || 3000 // Listen on port provided by production env, else use 3000 for development.

// View Engine
app.set('view engine', 'ejs');
app.use(express.static('resources'))


app.use(express.json({limit: '2048mb'})); // KAMAR sends extremely large JSON files above Express's default limit
app.use(express.urlencoded({extended: true, limit: '2048mb'}));

// Routing
const dashboard = require('./routes/dashboard')
const sync = require('./routes/sync')

// Dashboard endpoint
app.use('/', dashboard)

// Sync - KAMAR's sync endpoint
app.use('/sync', sync)

app.listen(port, () => { // Start the Express HTTP server
  console.log(`KAMAR Directory Sync Service listening on port ${port}`)
})