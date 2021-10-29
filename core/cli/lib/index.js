'use strict';

module.exports = core;

const semver = require('semver');
const colors = require('colors');
const npmlog = require('@s-cli/log');
const userHome = require('user-home');
const pathExists = require('path-exists');
const path = require('path');

const pkg = require('../package.json');
const constant = require('./const');

let args, config;

function core() {
    try {
        checkPkgVersion();
        checkNodeVersion();
        checkRoot();
        checkUserHome();
        checkInputArgs();
        checkEnv();
    } catch (e) {
        npmlog.error(e.message);
    }
}

function checkEnv() {
    const dotenv = require('dotenv');
    const dotenvPath = path.resolve(userHome, '.env');
    console.log(dotenvPath);
    if (pathExists.sync(dotenvPath)) {
        config = dotenv.config({
            path: dotenvPath,
        });
    }
    createDefaultConfig();
    npmlog.verbose('环境变量', process.env.CLI_HOME_PATH);
}

function createDefaultConfig() {
    const cliConfig = {
        home: userHome,
    };
    if (process.env.CLI_HOME) {
        cliConfig['cliHome'] = path.join(userHome, process.env.CLI_HOME);
    } else {
        cliConfig['cliHome'] = path.join(userHome, constant.DEFAULT_CLI_HOME);
    }
    process.env.CLI_HOME_PATH = cliConfig.cliHome;
    return cliConfig;
}

function checkInputArgs() {
    const minimist = require('minimist');
    args = minimist(process.argv.slice(2));
    checkArgs();
}

function checkArgs() {
    if (args.debug) {
        process.env.LOG_LEVEL = 'verbose';
    } else {
        process.env.LOG_LEVEL = 'info';
    }
    npmlog.level = process.env.LOG_LEVEL;
}

function checkUserHome() {
    if (!userHome || !pathExists.sync(userHome)) {
        throw new Error(colors.red('当前用户主目录不存在!'));
    }
}

function checkRoot() {
    const rootCheck = require('root-check');
    rootCheck();
}

function checkPkgVersion() {
    npmlog.notice('cli', pkg.version);
}

function checkNodeVersion() {
    // 获取当前 Node 版本号
    const currentVersion = process.version;
    const lowestVersion = constant.LOWEST_NODE_VERSION;
    // 比对最低版本号
    if (!semver.gte(currentVersion, lowestVersion)) {
        throw new Error(colors.red(`s-cli 需要安装 v${lowestVersion} 以上版本的 Node.js`));
    }
}
