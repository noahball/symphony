// Noah Ball
// October 2023

// Imports
const express = require('express')
const auth = require('basic-auth')
const fs = require('fs');

// Constants
const app = express()
const port = process.env.PORT || 3000 // Listen on port provided by production env, else use 3000 for development.

app.use(express.json({limit: '2048mb'})); // KAMAR sends extremely large JSON files above Express's default limit
app.use(express.urlencoded({extended: true, limit: '2048mb'}));

// Routing

app.get('/', (req, res) => {
  res.send('KAMAR Directory Sync Service')
})

// Sync - endpoint that KAMAR pushes to
app.all('/sync', (req, res) => {

    var credentials = auth(req) // Grab credentials from request

    var stream = fs.createWriteStream(`data/${Date.now()}.txt`); // Log the request to a timestamped file
    stream.once('open', function(fd) {
        stream.write(`${new Date().toLocaleString()}\n\n`) // Date
        stream.write(`${JSON.stringify(credentials)}\n\n`); // Credentials provided
        stream.write(`${JSON.stringify(req.body)}\n`); //  Data from KAMAR
        stream.end();
      });

    // Check credentials are valid
    if (!credentials || credentials.name !== 'aquinas-live' || credentials.pass !== '62cBuwVx8izVNAZn') {
        return res.status(401).json({"SMSDirectoryData": { // Return 401 if invalid credentials using KAMAR's format
            "error": 401,
            "result": "Authentication failed, please check your credentials and try again.",
            "service": "Noah's KAMAR Sync Service",
            "version": 1.0,
            }
        })
    }

    if (req.body.SMSDirectoryData.sync == "check") { // Check request handling
        console.log("Check request received at " + new Date().toLocaleString()) // Log that we've received a request
        return res.json({"SMSDirectoryData": { // Again in KAMAR's format
            "error": 0,
            "result": "OK",
            "service": "Noah's KAMAR Sync Service",
            "version": 1.0,
            "status": "Ready",
            "infourl": "https://noahball.com/",
            "privacystatement": "FOR PRODUCTION: Data is only used for the purpose of syncing with Google Workspace and Google Classroom. Student details are retained purely for this purpose and are disposed of as soon as they are no longer needed. Student photos are not stored locally and are sent straight to Google Workspace. All data is stored on a home lab server and can be erased upon request.",
            "options": { // Data that we're requesting from KAMAR
                "ics": false, // We don't want timetable/calendars in ICS format
                "students": { // Student data
                    "details": true, // Basic student details
                    "minLevel": 1,
                    "maxLevel": 13,
                    "photos": true, // ID Photos
                    "groups": false,
                    "awards": false,
                    "timetables": true, // Timetables
                    "attendance": false,
                    "assessments": false,
                    "pastoral": false,
                    "learningsupport": false,
                    "fields": {
                        "required": "uniqueid;firstname;lastname;gender;genderpreferred;username;email;house;yearlevel;tutor",
                        "optional": "firstnamelegal;lastnamelegal;forenames;forenameslegal;gendercode;timetablebottom1;timetablebottom2;timetablebottom3;timetablebottom4;timetabletop1;timetabletop2;timetabletop3;timetabletop4"
                        }
                    },
                "staff": { // Staff data
                    "details": true, // Basic staff details
                    "photos": true, // Staff photos
                    "timetables": true, // Staff timetables
                    "fields": {
                        "required": "uniqueid;firstname;lastname;title;username;gender;email;position;house;tutor",
                        "optional": ""
                        }
                    },
                "common": {
                    "subjects": true, // All subjects
                    "notices": true, // All notices
                    "calendar": true, // All calendar events
                    "bookings": false
                    }
                }
            }
        })
    }

    console.log("Synced at " + new Date().toLocaleString()) // Log that we've received a request other than check
    res.send({"SMSDirectoryData": { // Return generic OK response
        "error": 0,
        "result": "OK"
        }
    })
})

app.listen(port, () => { // Start the Express HTTP server
  console.log(`KAMAR Directory Sync Service listening on port ${port}`)
})