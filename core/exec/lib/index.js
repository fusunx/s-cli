'use strict';

const path = require('path');
const cp = require('child_process');
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

    const cmdObj = arguments[arguments.length - 1];
    const cmdName = cmdObj.name();
    const packageName = SETTINGS[cmdName];
    const packageVersion = 'latest';

    if (!targetPath) {
        // 生成缓存路径
        targetPath = path.resolve(homePath, CACHE_DIR);
        storeDir = path.resolve(homePath, CACHE_DIR, 'node_nodules');
        pkg = new Package({
            targetPath,
            storeDir,
            packageName,
            packageVersion,
        });

        if (await pkg.exists()) {
            // 更新 package
            await pkg.update();
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

    try {
        const args = Array.from(arguments);
        const cmd = args.pop();
        const o = Object.create(null);

        // 过滤元素
        Object.keys(cmd).forEach((key) => {
            if (cmd.hasOwnProperty(key) && !key.startsWith('_') && key !== 'parent') {
                o[key] = cmd[key];
            }
        });

        args.push(o);

        let code = `require('${rootFile}').call(null, ${JSON.stringify(args)})`;

        const child = spawn('node', ['-e', code], {
            pwd: process.cwd(),
            stdio: 'inherit',
        });

        child.on('error', (e) => {
            log.error(e.message);
            process.exit(1);
        });
        child.on('exit', (r) => {
            log.verbose('命令执行成功' + r);
            process.exit();
        });
    } catch (error) {
        log.error(error.message);
    }

    // 1. targetPath -> modulePath
    // 2. modulePath -> Package(npm 模块)
    // 3. Package.getRootFile(获取入口文件)
    // 4. Package.update / Package.install
}

function spawn(command, args, options) {
    const win32 = process.platform === 'win32';

    command = win32 ? 'cmd' : command;
    args = win32 ? ['/c'].concat(command, args) : args;

    return cp.spawn(command, args, options || {});
}

module.exports = exec;
