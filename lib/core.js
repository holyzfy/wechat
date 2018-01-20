var config = require('config');
var fs = require('fs-extra');
var express = require('express');
var bodyParser = require('body-parser');
var OAuth = require('wechat-oauth');
var WechatApi = require('wechat-api');
var Payment = require('wechat-pay').Payment;
var wechatPayMiddleware = require('wechat-pay').middleware;
var to = require('await-to-js').default;
var promisify = require('es6-promisify');
var moment = require('moment');
var util = require('./util.js');

var wechatApi;
var client;
var app;
var payment;
var payMiddleware;

function start(callback) {
    init();
    app.listen(config.port, callback);
}

function init() {
    wechatApi = new WechatApi(config.appId, config.appSecret);
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
    app.use(bodyParser.urlencoded({extended: false}));
    app.use(bodyParser.json());
    app.use(function cors(req, res, next) {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        next();
    });
    app.get('/js-config', getJsConfig);
    app.post('/login', login);
    app.post('/pay', pay);
    app.use(config.notifyUrl, payMiddleware.getNotify().done(notify));

    return app;
}

// @param req.query.{debug, jsApiList, url}
async function getJsConfig(req, res) {
    var promise = promisify(wechatApi.getJsConfig, wechatApi)(req.query);
    var [err, result] = await to(promise);
    if(err) {
        return util.handleError(res, err);
    }

    res.send({
        status: 0,
        data: result
    });
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

// @param req.body.{openId, body, fee}
async function pay(req, res) {
    var params = req.body;
    var order = {
        openid: params.openId,
        body: params.body,
        total_fee: params.fee,
        out_trade_no: moment().format('YYYYMMDDHHmmss'),
        spbill_create_ip: util.fixIp(req.ip),
        trade_type: 'JSAPI'
    };
    var [err, result] = await to(payment.getBrandWCPayRequestParams(order));
    if(err) {
        return util.handleError(res, err);
    }
    result.outTradeNo = order.out_trade_no;
    res.send({
        status: 0,
        data: result
    });
}

function notify(message, req, res, next) {
    res.reply('success');
}

module.exports = start;