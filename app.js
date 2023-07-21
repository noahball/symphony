const express = require('express')
const app = express()
const port = process.env.PORT || 3000

var auth = require('basic-auth')
app.use(express.json());

var fs = require('fs');

app.get('/', (req, res) => {
  res.send('KAMAR Directory Sync Service')
})

app.post('/sync', (req, res) => {

    var credentials = auth(req)

    var stream = fs.createWriteStream(`data/${Date.now()}.txt`);
    stream.once('open', function(fd) {
        stream.write(`${new Date().toLocaleString()}\n\n`)
        stream.write(`${JSON.stringify(credentials)}\n\n`);
        stream.write(`${JSON.stringify(req.body)}\n`);
        stream.end();
      });

    if (!credentials || credentials.name !== 'aquinas-live' || credentials.pass !== '62cBuwVx8izVNAZn') {
        return res.status(401).json({"SMSDirectoryData": {
            "error": 401,
            "result": "Authentication Failed, please check your credentials or contact Noah - noah.ball@aquinas.school.nz",
            "service": "Noah's KAMAR Sync Service",
            "version": 1.0,
            }
        })
    }

    if (req.body.SMSDirectoryData.sync == "check") {
        console.log("Check request received at " + new Date().toLocaleString())
        return res.json({"SMSDirectoryData": {
            "error": 0,
            "result": "OK",
            "service": "Noah's KAMAR Sync Service",
            "version": 1.0,
            "status": "Ready",
            "infourl": "https://noahball.com/",
            "privacystatement": "FOR PRODUCTION: Data is only used for the purpose of syncing with Google Workspace and Google Classroom. Student details are retained purely for this purpose and are disposed of as soon as they are no longer needed. Student photos are not stored locally and are sent straight to Google Workspace. All data is stored on a home lab server and can be erased upon request.",
            "options": {
                "ics": false,
                "students": {
                    "details": true,
                    "minLevel": 1,
                    "maxLevel": 13,
                    "photos": true,
                    "groups": false,
                    "awards": false,
                    "timetables": true,
                    "attendance": false,
                    "assessments": false,
                    "pastoral": false,
                    "learningsupport": false,
                    "fields": {
                        "required": "uniqueid;firstname;lastname;gender;genderpreferred;username;email;house;yearlevel;tutor",
                        "optional": "nsn;firstnamelegal;lastnamelegal;forenames;forenameslegal;gendercode;timetablebottom1;timetablebottom2;timetablebottom3;timetablebottom4;timetabletop1;timetabletop2;timetabletop3;timetabletop4"
                        }
                    },
                "staff": {
                    "details": true,
                    "photos": true,
                    "timetables": true,
                    "fields": {
                        "required": "uniqueid;firstname;lastname;title;username;gender;email;position;house;tutor",
                        "optional": ""
                        }
                    },
                "common": {
                    "subjects": true,
                    "notices": true,
                    "calendar": true,
                    "bookings": false
                    }
                }
            }
        })
    }

    console.log("Synced at " + new Date().toLocaleString())
    res.send({"SMSDirectoryData": {
        "error": 0,
        "result": "OK"
        }
    })
})

app.listen(port, () => {
  console.log(`KAMAR Directory Sync Service listening on port ${port}`)
})