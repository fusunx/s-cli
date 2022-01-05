'use strict';
const path = require('path');
const Package = require('@s-cli/package');
const log = require('@s-cli/log');

const SETTINGS = {
    init: '@s-cli/init',
};

const CACHE_DIR = 'dependencies';

async function exec() {
    const homePath = process.env.CLI_HOME_PATH;
    let targetPath = process.env.CLI_TARGET_PATH;
    let storeDir = '';
    let pkg = null;
    log.verbose(targetPath);
    log.verbose(homePath);

    const cmdObj = arguments[arguments.length - 1];
    const cmdName = cmdObj.name();
    const packageName = SETTINGS[cmdName];
    const packageVersion = 'latest';

    if (!targetPath) {
        // 生成缓存路径
        targetPath = path.resolve(homePath, CACHE_DIR);
        storeDir = path.resolve(homePath, CACHE_DIR, 'node_nodules');
        log.verbose(targetPath);
        log.verbose(storeDir);
        pkg = new Package({
            targetPath,
            storeDir,
            packageName,
            packageVersion,
        });

        if (await pkg.exists()) {
            // 更新 package
        } else {
            // 安装 package
            await pkg.install();
        }
    } else {
        pkg = new Package({
            targetPath,
            packageName,
            packageVersion,
        });
    }
    const rootFile = pkg.getRootFile();
    rootFile && require(rootFile).apply(null, arguments);

    // 1. targetPath -> modulePath
    // 2. modulePath -> Package(npm 模块)
    // 3. Package.getRootFile(获取入口文件)
    // 4. Package.update / Package.install
}

module.exports = exec;
