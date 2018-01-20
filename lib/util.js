function handleError(res, err) {
    res.send({
        status: err.code || 500,
        message: err.message || err.err_msg || err
    });
}

function fixIp(ip) {
    if(ip.slice(0, 7) === '::ffff:') {
        ip = ip.slice(7);
    } else if(ip === '::1') {
        ip = '127.0.0.1';
    }
    return ip;
}

module.exports = {
    handleError,
    fixIp
};