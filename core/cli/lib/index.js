'use strict';

module.exports = core;

const semver = require('semver');
const colors = require('colors');
const npmlog = require('@s-cli/log');
const userHome = require('user-home');
const pathExists = require('path-exists');
const path = require('path');
const commander = require('commander');

const pkg = require('../package.json');
const constant = require('./const');
const init = require('@s-cli/init');
const exec = require('@s-cli/exec');

let config;

const program = new commander.Command();

async function core() {
    try {
        await prepare();
        registerCommand();
    } catch (e) {
        npmlog.error(e.message);
        if (program.debug) {
            console.log(e);
        }
    }
}

function registerCommand() {
    program
        .name(Object.keys(pkg.bin)[0])
        .usage('<command> [options]')
        .version(pkg.version)
        .option('-d, --debug', '是否开启调试模式', false)
        .option('-tp, --targetPath <targetPath>', '是否指定本地文件调试路径', '');

    program.command('init [projectName]').option('-f, --force', '是否强制初始化').action(exec);

    // 开启 debug 模式
    program.on('option:debug', function () {
        if (this.opts().debug) {
            process.env.LOG_LEVEL = 'verbose';
        } else {
            process.env.LOG_LEVEL = 'info';
        }
        npmlog.level = process.env.LOG_LEVEL;
    });

    // 指定 targetPath
    program.on('option:targetPath', function () {
        process.env.CLI_TARGET_PATH = this.opts().targetPath;
    });

    // 对未知命令监听
    program.on('command:*', function (obj) {
        const availableCommands = program.commands.map((cmd) => cmd.name());
        console.log(colors.red(`未知的命令: ${obj[0]}`));
        if (availableCommands.length > 0) {
            console.log(colors.red(`可用命令: ${availableCommands.join(',')}`));
        }
    });

    program.parse(process.argv);

    if (program.args && program.args.length < 1) {
        program.outputHelp();
        console.log();
    }
}

async function prepare() {
    checkNodeVersion();
    checkRoot();
    checkUserHome();
    checkEnv();
    checkGlobalUpdate();
}

async function checkGlobalUpdate() {
    // 1. 获取当前版本号和模块名
    // 2. 调用 npm API，获取所有版本号
    // 3. 提取所有版本号，比对哪些版本大于当前版本号
    // 4. 获取最新的版本号，提示用户更新到该版本
    const currentVersion = pkg.version;
    const npmName = pkg.name;
    const { getNpmSemverVersion } = require('@s-cli/get-npm-info');
    const lastVersion = await getNpmSemverVersion(currentVersion, npmName);
    if (lastVersion && semver.gt(lastVersion, currentVersion)) {
        npmlog.warn(`请手动更新${npmName}, 当前版本：${currentVersion}, 最新版本：${lastVersion}
        更新命令： npm install -g ${npmName}`);
    }
}

function checkEnv() {
    const dotenv = require('dotenv');
    const dotenvPath = path.resolve(userHome, '.env');

    if (pathExists.sync(dotenvPath)) {
        config = dotenv.config({
            path: dotenvPath,
        });
    }
    createDefaultConfig();
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

function checkUserHome() {
    if (!userHome || !pathExists.sync(userHome)) {
        throw new Error(colors.red('当前用户主目录不存在!'));
    }
}

function checkRoot() {
    const rootCheck = require('root-check');
    rootCheck();
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
