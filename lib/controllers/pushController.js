"use strict";

exports.run = function(req, res, container) {

    container.getService('MONGODB').then(function(service) {

        service.send('findOne', {collectionName : 'apps', query : {where : {objectId : req.data.appid}}}, function(err, app) {

            if(err)
                return res.error(err);

            if(process.env.NODE_ENV === 'test' && req.data.appid === 'test') {

                app = {
                    data : {
                        applicationId : 'test'
                    }
                };
            }

            service.send('findOne', {collectionName : req.data.appid, query : {where : {objectId : req.data.objectId}}}, function(err, doc) {

                if(err)
                    return res.error(err);

                if(!doc || !doc.data)
                    return res.error(404, new Error('ResourceNotFound'));

                var where = doc.data.where;
                var data = doc.data.data;

                if(typeof(where) === 'string')
                    where = JSON.parse(where);
                else if(!where)
                    where = {};

                var pushReq = {
                    query : {
                        where : where
                    },
                    data : {
                        where : where,
                        data : data
                    },
                    session : {
                        appid : req.data.appid,
                        applicationId : app.data.applicationId,
                        appleCertFile : app.data.appleCertFile,
                        gcmApiKey : app.data.gcmApiKey,
                        windowsSid : app.data.windowsSid,
                        windowsClientSecret : app.data.windowsClientSecret
                    }
                };

                doPush(pushReq.data, pushReq, res, container);
            });
        });

    }).fail(function(err) {

        res.error(err);
    });
};

exports.create = function(req, res, container) {

    var data = parseRequest(req);
    var query = parseQuery(req);

    data._userid = req.session.userid;

    if(data.push_time) {

        container.getService('MONGODB').then(function (service) {

            data._sendCount = 0;
            data._className = '_Push';

            if(data.where)
                data.where = JSON.stringify(data.where);

            service.send('insert', {collectionName : req.session.appid, data : data}, function(err, doc) {

                if(err)
                    return res.error(err);

                var scheduleData = {
                    name : 'push_' + doc.data.objectId,
                    push : doc.data.objectId,
                    start :  { '$ISODate' : doc.data.push_time },
                    next : { '$ISODate' : doc.data.push_time },
                    _className : '_Schedule',
                    _appid : req.session.appid
                };

                if(doc.data.repeat)
                    scheduleData.repeat = doc.data.repeat;

                service.send('insert', {collectionName : 'schedule', data : scheduleData}, function(err, schedule) {

                    res.send(201, {
                        createdAt : doc.data.createdAt,
                        objectId : doc.data.objectId,
                        scheduleId : schedule.data.objectId
                    });
                });
            });

        }).fail(function (err) {

            res.error(err);
        });

    } else {

        doPush(data, req, res, container);
    }
};

function doPush(data, req, res, container) {

    container.getService('MONGODB').then(function (service) {

        req.query.where._className = '_Installations';
        req.query.limit = 100000;

        service.send('find', {collectionName : req.session.appid, query: req.query}, function (err, docs) {

            if (err)
                return res.error(err);

            if(docs.data && docs.data.length > 0) {

                process.nextTick(function() {
                    push(data.data, docs.data, req.session, service, container);
                });
            }

            data._sendCount = docs.data ? docs.data.length : 0;
            data._className = '_Push';

            if(data.where)
                data.where = JSON.stringify(data.where);

            service.send('insert', {collectionName : req.session.appid, data : data}, function(err, doc) {

                if(err)
                    return res.error(err);

                res.send(201, {
                    createdAt : doc.data.createdAt,
                    objectId : doc.data.objectId,
                    sendCount : data._sendCount
                });
            });

        });
    }).fail(function (err) {

        res.error(err);
    });
}

exports.read = function(req, res, container) {

    container.getService('MONGODB').then(function(service) {

        service.send('findOne', {collectionName : req.session.appid, query : {where : {objectId : req.params._objectId}}}, function(err, doc) {

            if(err)
                return res.error(err);

            res.send(200, doc.data);
        });
    }).fail(function(err) {

        res.error(err);
    });
};

exports.find = function(req, res, container) {

    container.getService('MONGODB').then(function (service) {

        if(!req.query.where)
            req.query.where = {};
        req.query.where._className = '_Push';

        service.send('find', {collectionName : req.session.appid, query: req.query}, function (err, docs) {

            if (err)
                return res.error(err);


            if (typeof(docs.data) === 'number') {

                res.send(200, {results: [], count: docs.data});
            } else {

                res.send(200, {results: docs.data});
            }
        });
    }).fail(function (err) {

        res.error(err);
    });
};

exports.destroyAll = function(req, res, container) {

    // 테스트에서만 사용
    if(process.env.NODE_ENV !== 'test') {

        return new Error("cannot access");
    }

    container.getService('MONGODB').then(function(service) {

        service.send('remove', {collectionName : req.session.appid, query : {_className : '_Push'}}, function(err, doc) {

            if(err)
                return res.error(err);

            res.send(200, {});
        });
    }).fail(function(err) {

        res.error(err);
    });
};


function push(data, docs, session, service, container) {

    var iosPush = require('../push/ios');
    var androidPush = require('../push/android');
    var iosTargets = [];
    var androidTargets = [];

    for(var i= 0, cnt= docs.length; i<cnt; i++) {

        if(docs[i].deviceType == 'ios')
            iosTargets.push(docs[i].deviceToken);
        else if(docs[i].deviceType == 'android')
            androidTargets.push(docs[i].deviceToken);
        else
            continue;
    }

    if(iosTargets.length > 0) {

        if(session.appleCertFile) {

            service.send('findOne', {collectionName : session.appid, query : {_className : '_Files', objectId : session.appleCertFile}}, function(err, doc) {

                if(!err && doc.data && doc.data.realFilePath) {

                    iosPush.send(container, iosTargets, data, doc.data.realFilePath);
                }
            });
        }
    }


    if(androidTargets.length > 0)
        androidPush.send(container, androidTargets, data, session.gcmApiKey);
}

function parseRequest(req) {

    if(req.data && req.data.where)
        req.query.where = req.data.where;

    if(req.data && req.data.channels)
        req.query.where.channels = req.data.channels;

    return req.data;
}

function parseQuery(req) {

    var _ = require('lodash');
    var query = _.cloneDeep(req.query);

    if(query.where.channels && query.where.channels.length > 0)
        query.where.channels = {'$in': query.where.channels};

    return query;
}
