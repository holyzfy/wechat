# 微信支付

## 安装

运行 `npm install`

## 使用

1. 公共号配置

   - 请登录`微信公众平台 > 开发 > 基本配置`，将服务器IP地址添加到IP白名单中
   - 请登录`微信公众平台 > 设置 > 公共号设置`，填写业务域名，JS接口安全域名和网页授权域名
   - 请登录`微信支付商户平台 > 产品中心 > 开发配置`，填写支付授权目录

2. 创建文件config/local.json

    ```json
    {
        "port": 80,
        "appId": "微信公共平台 > 开发 > 基本配置 > 开发者ID",
        "appSecret": "微信公共平台 > 开发 > 基本配置 > 开发者密码",
        "mchId": "微信支付商户号",
        "partnerKey": "微信支付API密钥",
        "notifyUrl": "通知地址，异步接收微信支付结果通知的回调地址，通知url必须为外网可访问的url，不能携带参数"
    }
    ```
3. 修改 `demo/index.html` 第14行的`appid`
4. 修改 `js/index.js` 第7行的`apiRoot`
5. 运行 `node index.js`启动服务

## 接口文档

### 获取微信JS SDK Config的所需参数

get /js-config

- **debug**: 调试开关
- **jsApiList[]**: 需要使用的JS接口列表
- **url**: 当前网页的URL，不包含#及其后面部分

```json
{
    "status": 0,
    "data": {
        "debug": "true",
        "appId": "wx0r57ec35106707aa",
        "timestamp": "1516417554",
        "nonceStr": "s0w2mh09rfg",
        "signature": "88f7e2e0e9d51586bbbe7bdd28715d475a28f023",
        "jsApiList": [
            "onMenuShareTimeline",
            "onMenuShareAppMessage"
        ]
    }
}
```

### 登录

POST /login

- **code**: 用户同意授权后的code

```json
{
    "status": 0,
    "data": {
        "openid": "7kG0l1JLPJDexcOR44yae-_yb4fv",
        "nickname": "Yuko Ogura",
        "sex": 1,
        "language": "zh_CN",
        "city": "Zhengzhou",
        "province": "Henan",
        "country": "China",
        "headimgurl": "http://wx.qlogo.cn/mmopen/vi_77/xxx/168",
        "privilege": []
    }
}
```

### 付款

POST /pay

- **openId**: 用户标识
- **body**: 商品描述
- **fee**: 订单总金额，单位为分

```json
{
    "status": 0,
    "data": {
        "appId": "wxe16b5a2936422xxx",
        "timeStamp": "1516369492",
        "nonceStr": "9IKWGH3S0te3DlV3MtEgxcTGzhEwTPhN",
        "signType": "MD5",
        "package": "prepay_id=wx2018011921444755892ec5d52d549be391",
        "paySign": "6EBB65963DF2BBDAB0H1C081C19C1E39",
        "timestamp": "1516369492"
    }
}
```

前端通过下述接口来呼出微信的支付界面

```js
// params值为上面的`data`字段
WeixinJSBridge.invoke('getBrandWCPayRequest', params, function(res) {
    if(res.err_msg === "get_brand_wcpay_request:ok"){
        // TODO 支付成功
    }else{
        // TODO 支付失败
    }
});
```

### ajax响应数据格式

```js
{
    "status": 0, // 0表示正常响应，其他整数表示异常响应
    "message": "请求成功", // 可选字段
    "data": {
        // 数据部分放到此字段里，可以是任意的JSON数据类型
    }
}
```
