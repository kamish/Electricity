const superagent = require('superagent');
const config = require('../common/config');

setInterval( () => {
    superagent
    .post(`${config.recieverHost}:${config.recieverPort}/`)
    .send({
        'heartbeat': Math.floor(Date.now() / 1E3)
    })
    .set("Bearer", config.token)
    .end((err, res) => {
        if (err)
        {
            console.log("Error:", err)
            // process.exit()
        }
        else
            console.log(res.body)
    });
}, config.senderHeartbeatInterval);
