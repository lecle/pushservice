module.exports.send = function(container, targets, data, certFilePath) {

    var options = {
//        cert : '/cert.pem',
//        key : '/noserv_dev.pem',
        pfx : certFilePath,
        gateway: "gateway.push.apple.com" };

    var apn = require('apn');

    var apnConnection = new apn.Connection(options);

    var note = new apn.Notification();

    var msg_text = data.alert;

    if (msg_text && msg_text.length > 40) {
        msg_text = msg_text.substring(0, 37) + '...';
    }

    note.expiry = Math.floor(Date.now() / 1000) + 3600; // Expires 1 hour from now.
    note.sound = data.sound;
    note.alert = msg_text;
    note.badge = data.badge;
    note.contentAvailable = data.contentAvailable;
    note.category = data.category;

    apnConnection.on('error', function(){console.log('error');});
    apnConnection.on('transmitted', function(){console.log('transmitted');});
    apnConnection.on('timeout', function(){console.log('timeout');});
    apnConnection.on('connected', function(){console.log('connected');});
    apnConnection.on('disconnected', function(){console.log('disconnected');});
    apnConnection.on('socketError', function(){console.log('socketError');});
    apnConnection.on('transmissionError', function(){console.log('transmissionError');});
    apnConnection.on('cacheTooSmall', function(){console.log('cacheTooSmall');});

    // 테스트에서는 보내지 말자
    if(process.env.NODE_ENV !== 'test') {

        apnConnection.pushNotification(note, targets);
        container.log.info('ios send ' + targets.length);
    }
};
