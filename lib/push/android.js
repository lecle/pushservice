module.exports.send = function(container, targets, data, gcmApiKey) {

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

    if(!gcmApiKey)
        gcmApiKey = 'AIzaSyBUn3Y8QnSITHx0paIMVA5jHE9iuC6Dmbo';

    var sender = new gcm.Sender(gcmApiKey);

    // 테스트에서는 보내지 말자
    if(process.env.NODE_ENV !== 'test') {

        container.log.info('message', message);
        container.log.info('targets', targets);

        sender.send(message, targets, 4, function (err, result) {

            if(err)
                container.log.error('android push error ' + err.message);

            container.log.info('android send ' + targets.length);
        });
    }

};
