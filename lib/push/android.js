module.exports.send = function(targets, data) {

    var gcm = require('node-gcm');

    var message = new gcm.Message({
        collapseKey : 'demo',
        delayWhileIdle : false,
        timeToLive : 3,
        data : {
            msg : data.alert,
            action : data.action,
            title : data.title
        }
    });

    var sender = new gcm.Sender('AIzaSyBUn3Y8QnSITHx0paIMVA5jHE9iuC6Dmbo');

    // 테스트에서는 보내지 말자
    if(process.env.NODE_ENV !== 'test') {

        console.log('message', message);
        console.log('targets', targets);

        sender.send(message, targets, 4, function (err, result) {

            if(err)
                console.log('android push error ' + err.message);

            console.log('android send ' + targets.length);
        });
    }

};