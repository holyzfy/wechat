var config = require('config');
var fs = require('fs-extra');
var express = require('express');
var OAuth = require('wechat-oauth');
var Payment = require('wechat-pay').Payment;
var wechatPayMiddleware = require('wechat-pay').middleware;
var to = require('await-to-js').default;
var promisify = require('es6-promisify');
var moment = require('moment');
var util = require('./util.js');

var client;
var app;
var payment;
var payMiddleware;

function start(callback) {
    init();
    app.listen(config.port, callback);
}

function init() {
    client = initClient(config.appId, config.appSecret);
    ({payment, payMiddleware} = initPay(config));
    app = initApp();
}

function initClient(appId, appSecret) {
    return new OAuth(appId, appSecret, (openId, callback) => {
        fs.readFile(`cache/${openId}/:access_token.txt`, 'utf8', (err, txt) => {
            if(err) {
                return callback(err);
            }
            callback(null, JSON.parse(txt));
        });
    }, (openId, token, callback) => {
        fs.ensureDirSync(`cache/${openId}`);
        fs.writeFile(`cache/${openId}/:access_token.txt`, JSON.stringify(token), callback);
    });
}

// @param {partnerKey, appId, mchId, notifyUrl}
function initPay(config) {
    var payment = new Payment(config);
    var payMiddleware = wechatPayMiddleware(config);
    return {payment, payMiddleware};
}

function initApp() {
    var app = express();
    app.use(function cors(req, res, next) {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        next();
    });

    app.post('/login', login);
    app.post('/pay', pay);
    app.use(config.notifyUrl, payMiddleware.getNotify().done(notify));

    return app;
}

// @param req.query.code
async function login(req, res) {
    var promise = promisify(client.getAccessToken, client)(req.query.code);
    var [err, result] = await to(promise);
    if(err) {
        return util.handleError(res, err);
    }

    promise = promisify(client.getUser, client)(result.data.openid);
    [err, result] = await to(promise);
    if(err) {
        return util.handleError(res, err);
    }

    res.send({
        status: 0,
        data: result
    });
}

// @param req.query.{openId, body, fee}
async function pay(req, res) {
    var query = req.query;
    var order = {
        openid: query.openId,
        body: query.body,
        total_fee: query.fee,
        out_trade_no: moment().format('YYYYMMDDHHmmss'),
        spbill_create_ip: util.fixIp(req.ip),
        trade_type: 'JSAPI'
    };
    var [err, result] = await to(payment.getBrandWCPayRequestParams(order));
    if(err) {
        return util.handleError(res, err);
    }
    res.send({
        status: 0,
        data: result
    });
}

function notify(message, req, res, next) {
    res.reply('success');
}

module.exports = start;