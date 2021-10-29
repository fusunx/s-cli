'use strict';

const npmlog = require('npmlog');

npmlog.level = process.env.LOG_LEVEL ? process.env.LOG_LEVEL : 'info';
npmlog.heading = 's-cli'; // 修改前缀
npmlog.addLevel('success', 2000, { fg: 'green' }); // 添加自定义命令

module.exports = npmlog;
