module.exports.send = function(container, targets, data, gcmApiKey) {

    if(!targets || targets.length === 0)
        return;

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
    if(process.env.NODE_ENV === 'test')
        return;

    container.log.info('message', message);
    container.log.info('count', targets.length);
    container.log.debug('targets', targets);

    var _ = require('lodash');

    for(var i= 0, cnt=targets.length; i<cnt; i+=1000) {

        sender.send(message, _.slice(targets, i, i+1000), 4, function (err, result) {

            if(err)
                container.log.error('android push error', err);

            container.log.info('android send', result);
        });
    }
};
