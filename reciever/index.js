const config = require('../common/config');

const sqlite3 = require('sqlite3').verbose();
let db = new sqlite3.Database('../electricity.db');

db.serialize(() => {
  db.run("CREATE TABLE IF NOT EXISTS outages (start INTEGER, end INTEGER, finished INTEGER)");
});

const express = require('express')

const app = express()
app.use(express.json())

let lastHeartBeat = Math.floor(Date.now() / 1E3)
let outageLastId = null

db.get("SELECT rowid as id, * FROM outages WHERE finished = FALSE ", [], (err, row) => {
    console.info("Last not finished outage:", row, err)
    if (row) {
        console.info(row)
        lastHeartBeat = row.start
        outageLastId = row.id
    }
});

app.post('/', (req, res) => {
    if (req.get('Bearer') != config.token) {
        return res.status(403).json({ error: 'No credentials sent!' });
    }

    res.send({result: "ok"})

      if (req.body.heartbeat > lastHeartBeat) {
        lastHeartBeat = req.body.heartbeat
        console.debug('Heartbeat:', new Date(lastHeartBeat * 1000).toLocaleString())
    }
})
  
app.listen(config.recieverPort, () => {
    console.log(`App listening on port ${config.recieverPort}`)
})

setInterval( () => {
    const curTime = Math.floor(new Date().getTime() / 1E3);

    if (curTime - lastHeartBeat > Math.floor(config.outageInterval / 1000))
    {
        if (outageLastId) {
            console.info("Outage continues, started at:", new Date(lastHeartBeat * 1000).toLocaleString())
            const err = db.run(`UPDATE outages SET end = ? WHERE rowid = ?`, [curTime, outageLastId], function(err) {
                if (err) {
                    return console.log(err.message);
                }
            })
        } else {
            console.info("Outage started:", new Date(lastHeartBeat * 1000).toLocaleString())
            db.run(`INSERT INTO outages VALUES(?,?,?)`, [lastHeartBeat, curTime, false], function(err) {
                if (err) {
                    return console.log(err.message);
                }
                outageLastId = this.lastID
                console.log(`A row has been inserted with rowid ${this.lastID}`);
            })
        }
    } else {
        if (outageLastId) {
            console.info("Outage ended:", new Date(lastHeartBeat * 1000).toLocaleString())
            const err = db.run("UPDATE outages SET end = ?, finished = TRUE WHERE rowid = ?", [lastHeartBeat, outageLastId], function(err) {
                if (err) {
                    return console.log(err.message);
                }
                outageLastId = null;
            })
        }
    }
}, 15000);