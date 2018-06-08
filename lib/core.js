var config = require('config');
var fs = require('fs-extra');
var express = require('express');
var bodyParser = require('body-parser');
var OAuth = require('wechat-oauth');
var WechatApi = require('wechat-api');
var Payment = require('wechat-pay').Payment;
var to = require('await-to-js').default;
var promisify = require('es6-promisify');
var moment = require('moment');
var parseString = promisify(require('xml2js').parseString);
var util = require('./util.js');

var wechatApi;
var client;
var app;
var payment;

function start(callback) {
    init();
    app.listen(config.port || 0, callback.bind(null, app));
}

function init() {
    wechatApi = new WechatApi(config.appId, config.appSecret);
    client = initClient(config.appId, config.appSecret);
    payment = new Payment(config);
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

function initApp() {
    var app = express();
    app.use(bodyParser.urlencoded({extended: false}));
    app.use(bodyParser.json());
    app.use(bodyParser.text({type: ['text/xml', 'application/xml']}));
    app.use(function cors(req, res, next) {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        next();
    });
    app.get('/js-config', getJsConfig);
    app.post('/login', login);
    app.post('/pay', pay);
    app.use('/notify', notify);

    return app;
}

// @param req.query.{debug, jsApiList, url}
async function getJsConfig(req, res) {
    var promise = promisify(wechatApi.getJsConfig.bind(wechatApi))(req.query);
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
    var promise = promisify(client.getAccessToken.bind(client))(req.query.code);
    var [err, result] = await to(promise);
    if(err) {
        return util.handleError(res, err);
    }

    promise = promisify(client.getUser.bind(client))(result.data.openid);
    [err, result] = await to(promise);
    if(err) {
        return util.handleError(res, err);
    }

    res.send({
        status: 0,
        data: result
    });
}

async function pay(req, res) {
    /*eslint-disable no-redeclare*/
    var params = req.body;
    var [err, product] = await to(getProduct(req.id));
    var order = {
        openid: params.openid,
        body: product.body,
        attach: params.attach,
        total_fee: product.total_fee,
        out_trade_no: moment().format('YYYYMMDDHHmmss'),
        spbill_create_ip: util.fixIp(req.ip),
        notify_url: config.notifyUrl,
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

async function getProduct(id) {
    var shop = '迪兰朵美体馆';
    var map = {
        '111': '面部补水',
        '112': '颈肩调理',
        '113': '泥炙养生'
    };
    var title = map[pid] || '无描述';
    var body = shop + '-' + title;

    var feeMap = {
        '111': 1,
        '112': 2,
        '113': 3
    };
    var fee = feeMap[pid] || 0;

    return {
        body: body,
        total_fee: fee
    };
}

async function notify(req, res, next) {
    var [err, ret] = await to(parseString(req.body, {explicitArray: false}));
    console.log(new Date, err || ret);
    // TODO 保存订单
    res.set('Content-Type', 'application/xml');
    res.send(`<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>`);
}

module.exports = start;