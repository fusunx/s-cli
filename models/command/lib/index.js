'use strict';
const semver = require('semver');
const colors = require('colors');
const npmlog = require('@s-cli/log');

const LOWEST_NODE_VERSION = '12.0.0';

class Comamnd {
    constructor(argv) {
        if (!argv) {
            throw new Error('参数必须传入！');
        }

        if (!Array.isArray(argv)) {
            throw new Error('参数必须是数组！');
        }

        if (argv.length < 1) {
            throw new Error('参数列表为空！');
        }

        this._argv = argv;
        let runner = new Promise((resolve, reject) => {
            let chain = Promise.resolve();
            chain = chain.then(() => this.checkNodeVersion());
            chain = chain.then(() => this.initArgs());
            chain = chain.then(() => this.init());
            chain = chain.then(() => this.exec());
            chain.catch((err) => {
                npmlog.error(err.message);
            });
        });
    }

    checkNodeVersion() {
        // 获取当前 Node 版本号
        const currentVersion = process.version;
        const lowestVersion = LOWEST_NODE_VERSION;
        // 比对最低版本号
        if (!semver.gte(currentVersion, lowestVersion)) {
            throw new Error(colors.red(`s-cli 需要安装 v${lowestVersion} 以上版本的 Node.js`));
        }
    }

    initArgs() {
        this._cmd = this._argv.pop();
    }

    init() {
        throw new Error('init 必须实现');
    }

    exec() {
        throw new Error('exec 必须实现');
    }
}

module.exports = Comamnd;
