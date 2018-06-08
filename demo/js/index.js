'use strict';

var app = {};

(function () {

var apiRoot = '';
if(!apiRoot) {
    return alert ('请填写接口域名');
}

function init() {
    wxConfig();
    $.post(apiRoot + '/login' + location.search, function (result) {
        if(result.status === 40163) {
            // code已用过，重新获取
            location.href = location.href.split('?')[0];
            return;
        }
        if(result.status !== 0) {
            return handleError(result.message);
        }
        initApp(result.data);
    });
}

function wxConfig() {
    var params = {
        // debug: true,
        jsApiList: [
            'onMenuShareTimeline',
            'onMenuShareAppMessage',
            'onMenuShareQQ',
            'onMenuShareWeibo',
            'onMenuShareQZone',
            'chooseWXPay'
        ],
        url: location.href.split('#')[0]
    };
    $.get(apiRoot + '/js-config', params, function (result) {
        if(result.status !== 0) {
            return handleError(result.message);
        }
        wx.config(result.data);
    });
}

function initApp(user) {
    new Vue({
        el: '#app',
        data: {
            user: user
        },
        methods: {
            pay: function (pid) {
                pay({
                    pid: pid,
                    openid: this.user.openid,
                    attach: '自定义数据'
                });
            }
        }
    });
}

function pay(params) {
    $.post(apiRoot + '/pay', params, function (result) {
        if(result.status !== 0) {
            return handleError(result.message);
        }
        WeixinJSBridge.invoke('getBrandWCPayRequest', result.data, function(ret) {
            if(ret.err_msg === 'get_brand_wcpay_request:ok') {
                alert('支付成功，请分享给好友或朋友圈吧。');
                share(pid, result.data.outTradeNo);
            } else {
                // 由于前端交互复杂，get_brand_wcpay_request:cancel或者get_brand_wcpay_request:fail可以统一处理为用户遇到错误或者主动放弃，不必细化区分
            }
        });
    });
}

function share(pid, outTradeNo) {
    var params = {
        title: '我购买了商品ID=' + pid,
        desc: '订单号' + outTradeNo,
        link: location.href.split('#')[0],
        // imgUrl: '',
        success: function () {
            alert('分享成功');
        }
    };
    wx.onMenuShareTimeline(params);
    wx.onMenuShareAppMessage(params);
    wx.onMenuShareQQ(params);
}

function handleError(message) {
    alert('出错啦：' + message);
}

app.init = init;
})();