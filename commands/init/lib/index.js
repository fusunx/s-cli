'use strict';
const fs = require('fs');
const inquirer = require('inquirer');
const fse = require('fs-extra');
const semver = require('semver');
const Comamnd = require('@s-cli/command');
const log = require('@s-cli/log');

const TYPE_PROJECT = 'project';
const TYPE_COMPONENT = 'conponent';

class InitCommand extends Comamnd {
    init() {
        this.projectName = this._argv[0] || '';
        this.force = !!this._argv[1].force;
        log.verbose('projectName: ', this.projectName);
        log.verbose('force: ', this.force);
    }
    async exec() {
        try {
            // 1.准备阶段
            const projectInfo = await this.prepare();
            if (projectInfo) {
                log.verbose(JSON.stringify(projectInfo));
                // 2.下载模版
                this.downloadTemplate();
                // 3.安装模版
            }
        } catch (error) {
            log.error(error.message);
        }
    }

    async prepare() {
        const localPath = process.cwd();
        // 1.判断当前目录是否为空
        // 2.是否启动强制更新
        if (!this.isDirEmpty(localPath)) {
            let ifContinue = false;
            if (!this.force) {
                // 询问是否创建
                ifContinue = (
                    await inquirer.prompt({
                        type: 'confirm',
                        message: '当前文件夹不为空，是否继续创建？',
                        name: 'ifContinue',
                        default: false,
                    })
                ).ifContinue;

                if (!ifContinue) {
                    return;
                }
            }

            if (this.force || ifContinue) {
                // 二次确认
                const { confirmDelete } = await inquirer.prompt({
                    type: 'confirm',
                    message: '是否确认清空当前文件夹？',
                    name: 'confirmDelete',
                    default: false,
                });

                console.log('清空当前目录', confirmDelete);
                if (confirmDelete) {
                    // 清空当前目录
                    fse.emptyDirSync(localPath);
                }
            }
        }

        return this.getProjectInfo();
    }

    downloadTemplate() {
        // 1. 通过项目模板API获取项目模板信息
        // 1.1 通过 egg.js 搭建一套后端系统
        // 1.2 通过 npm 存储项目模板
        // 1.3 将项目模板信息存储到 mongodb 数据库中
        // 1.4 通过 egg.js 获取 mongodb 中的数据并通过 API 返回
    }

    async getProjectInfo() {
        let projectInfo = {};
        // 1.选择创建项目或组件
        const { type } = await inquirer.prompt({
            name: 'type',
            type: 'list',
            message: '请选择初始化类型',
            default: TYPE_PROJECT,
            choices: [
                { name: '项目', value: TYPE_PROJECT },
                { name: '组件', value: TYPE_COMPONENT },
            ],
        });

        // 2.获取项目的基本信息
        if (type === TYPE_PROJECT) {
            const project = await inquirer.prompt([
                {
                    name: 'projectName',
                    type: 'input',
                    message: '请输入项目名称',
                    default: '',
                    validate(v) {
                        // 1.首字符必须为英文字符
                        // 2.尾字符必须为英文或数字
                        // 3.字符仅允许为‘-_’

                        const r =
                            /^[a-zA-Z]+([-][a-zA-Z][a-zA-Z0-9]*|[_][a-zA-Z][a-zA-Z0-9]*|[a-zA-Z0-9])*$/;

                        const done = this.async();
                        setTimeout(() => {
                            if (!r.test(v)) {
                                done('请输入正确项目名称！字母开头且仅支持字母数字下划线 ');
                                return;
                            }
                            done(null, true);
                        }, 0);
                    },
                    filter(v) {
                        return v;
                    },
                },
                {
                    name: 'projectVersion',
                    type: 'input',
                    message: '请输入项目版本号',
                    default: '1.0.0',
                    validate(v) {
                        const done = this.async();
                        setTimeout(() => {
                            if (!!!semver.valid(v)) {
                                done('请输入正确版本号！');
                                return;
                            }
                            done(null, true);
                        }, 0);
                    },
                    filter(v) {
                        if (!!semver.valid(v)) {
                            return semver.valid(v);
                        } else {
                            return v;
                        }
                    },
                },
            ]);
            projectInfo = {
                type,
                ...project,
            };
        } else if (type === TYPE_COMPONENT) {
        }
        // return Object(projectInfo)
        return projectInfo;
    }

    isDirEmpty(localPath) {
        let fileList = fs.readdirSync(localPath);
        // 文件过滤的逻辑
        fileList = fileList.filter((file) => {
            return !file.startsWith('.') && ['node_modules'].indexOf(file) < 0;
        });
        return !fileList || fileList.length <= 0;
    }
}

function init(argv) {
    return new InitCommand(argv);
}

module.exports = init;

module.exports.InitCommand = InitCommand;
