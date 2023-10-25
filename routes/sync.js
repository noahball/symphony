const express = require("express");
const router = express.Router();
const auth = require('basic-auth')
const fs = require('fs');
const client = require("../helpers/redis.js");

router.all("/", async function (req, res) {
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

    console.log(req.body)

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
    } else if (req.body.SMSDirectoryData.sync == "studenttimetables") {
        var classStr = await client.get("classData"); // Get the class data from Redis
        if (!classStr) { // If there is no class data
            var classData = {}; // Create an empty object
        } else {
            var classData = JSON.parse(classStr); // Parse the class data
        }

        for (var i = 0; i < req.body.SMSDirectoryData.timetables.data.length; i++) { // For each student
            for (var j = 0; j < req.body.SMSDirectoryData.timetables.data[i].timetable.length; j++) { // For each week
                for (var k = 0; k < req.body.SMSDirectoryData.timetables.data[i].timetable[j].days.length; k++) { // For each day
                    for (var l = 0; l < req.body.SMSDirectoryData.timetables.data[i].timetable[j].days[k].slots.length; l++) { // For each slot
                        var objStr = JSON.stringify(req.body.SMSDirectoryData.timetables.data[i].timetable[j].days[k].slots[l][0]); // Class data for this period
                        if (objStr) { // If there is a class this period (eg. not a break)
                            var obj = JSON.parse(objStr); // Parse the class data
                            // console.log(obj)
                            if (obj.option) { // If it's an option class
                                if (!classData[`${obj.code} (${obj.option})`]) { // If we haven't seen this class before
                                    classData[`${obj.code} (${obj.option})`] = { code: obj.code, line: obj.option, teacher: obj.teachers[0], students: []}; // Create an array for it
                                }
                                if (!classData[`${obj.code} (${obj.option})`].students.includes(req.body.SMSDirectoryData.timetables.data[i].student)) { // If this student isn't already in the class list for this class
                                    classData[`${obj.code} (${obj.option})`].students.push(req.body.SMSDirectoryData.timetables.data[i].student); // Add them
                                }
                            } else if (obj.core) { // If it's a core class
                                if (!classData[`${obj.code} (${obj.core})`]) { // If we haven't seen this class before
                                    classData[`${obj.code} (${obj.core})`] = { code: obj.code, line: obj.core, teacher: obj.teachers[0], students: []}; // Create an array for it
                                }
                                if (!classData[`${obj.code} (${obj.core})`].students.includes(req.body.SMSDirectoryData.timetables.data[i].student)) { // If this student isn't already in the class list for this class
                                    classData[`${obj.code} (${obj.core})`].students.push(req.body.SMSDirectoryData.timetables.data[i].student); // Add them
                                }
                            }
                        }
                    }
                }
            }
        }
        console.log(classData)
        client.set("classData", JSON.stringify(classData));
    }

    console.log("Synced at " + new Date().toLocaleString()) // Log that we've received a request other than check
    res.send({"SMSDirectoryData": { // Return generic OK response
        "error": 0,
        "result": "OK"
        }
    })
});

module.exports = router;