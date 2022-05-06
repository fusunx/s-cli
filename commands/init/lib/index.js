'use strict';
const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');
const fse = require('fs-extra');
const semver = require('semver');
const userHome = require('user-home');
const glob = require('glob');
const ejs = require('ejs');
const Comamnd = require('@s-cli/command');
const Package = require('@s-cli/package');
const { spinnerStart, sleep, execAsync } = require('@s-cli/utils');
const log = require('@s-cli/log');
const getProjectTemplate = require('./getProjectTemplate');

const TYPE_PROJECT = 'project';
const TYPE_COMPONENT = 'component';

const TEMPLATE_TYPE_NORMAL = 'normal';
const TEMPLATE_TYPE_CUSTOM = 'custom';

const WHITE_COMMAND = ['npm', 'cnpm', 'yarn'];

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
        this.projectInfo = projectInfo;
        // 2.下载模版
        await this.downloadTemplate();
        // 3.安装模版
        await this.installTemplate();
      }
    } catch (error) {
      log.error(error.message);
      if (process.env.LOG_LEVAL === 'verbose') {
        console.log(error);
      }
    }
  }

  async installTemplate() {
    if (this.templateInfo) {
      console.log('this.templateInfo.type: ', this.templateInfo.type);
      if (!this.templateInfo.type) {
        this.templateInfo.type = TEMPLATE_TYPE_NORMAL;
      }
      if (this.templateInfo.type === TEMPLATE_TYPE_NORMAL) {
        // 标准安装
        await this.installNormalTemplate();
      } else if (this.templateInfo.type === TEMPLATE_TYPE_CUSTOM) {
        // 自定义安装
        await this.installCuntomTemplate();
      } else {
        throw new Error('无法识别模版类型！');
      }
    } else {
      throw new Error('项目模版不存在！');
    }
  }

  async execCommand(templateCommand, errMessage) {
    let commandRet = null;
    if (templateCommand) {
      const cmd = templateCommand.split(' ');
      const command = this.checkCommand(cmd[0]);
      const args = cmd.slice(1);
      commandRet = await execAsync(command, args, {
        pwd: process.cwd(),
        stdio: 'inherit',
      });

      if (commandRet !== 0) {
        throw new Error(`${templateCommand} 命令执行失败`);
      } else {
        log.success(`${templateCommand} 命令执行成功`);
      }
    } else {
      throw new Error(errMessage);
    }
  }

  checkCommand(cmd) {
    if (WHITE_COMMAND.includes(cmd)) {
      return cmd;
    }
    return null;
  }

  ejsRender(ingore) {
    const dir = process.cwd();
    const projectInfo = this.projectInfo;
    return new Promise((resolve, reject) => {
      glob('**', { cwd: dir, ignore: ingore, nodir: true }, (err, files) => {
        if (err) {
          reject(err);
        }
        Promise.all(
          files.map(file => {
            const filePath = path.join(dir, file);
            return new Promise((resolve1, reject1) => {
              ejs.renderFile(filePath, projectInfo, {}, (err, result) => {
                if (err) {
                  reject1(err);
                } else {
                  fse.writeFileSync(filePath, result);
                  resolve1(result);
                }
              });
            });
          })
        )
          .then(res => {})
          .catch(err => {
            reject(err);
          });
      });
    });
  }

  async installNormalTemplate() {
    const spinner = spinnerStart('正在安装模版...');
    await sleep();
    try {
      const templatePath = path.resolve(this.templateNpm.cacheFilePath, 'template');
      const targetPath = process.cwd();
      fse.ensureDirSync(templatePath);
      fse.ensureDirSync(targetPath);
      fse.copySync(templatePath, targetPath);
    } catch (error) {
      throw error;
    } finally {
      spinner.stop(true);
      log.success('模版安装成功');
    }
    // ejs 模版渲染
    const templateIgnore = this.templateInfo.ignore || [];
    const ignore = ['node_modules/**', ...templateIgnore];
    this.ejsRender(ignore);
    // 执行命令
    const { installCommand, startCommand } = this.templateInfo;
    await this.execCommand(installCommand, '依赖安装失败');
    await this.execCommand(startCommand, `${startCommand} 命令执行失败 `);
  }

  async installCuntomTemplate() {
    console.log('安装自定义模版');
  }

  async prepare() {
    // 0. 判断项目模版是否存在
    const template = await getProjectTemplate();
    if (!template || template.length === 0) {
      throw new Error('模版不存在');
    }
    this.template = template;
    // 1.判断当前目录是否为空
    const localPath = process.cwd();
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
        if (confirmDelete) {
          // 清空当前目录
          fse.emptyDirSync(localPath);
        }
      }
    }

    return this.getProjectInfo();
  }

  async downloadTemplate() {
    // 1. 通过项目模板API获取项目模板信息
    // 1.1 通过 egg.js 搭建一套后端系统
    // 1.2 通过 npm 存储项目模板
    // 1.3 将项目模板信息存储到 mongodb 数据库中
    // 1.4 通过 egg.js 获取 mongodb 中的数据并通过 API 返回
    const { projectTemplate } = this.projectInfo;
    const templateInfo = this.template.find(item => item.npmName === projectTemplate);
    const targetPath = path.resolve(userHome, '.s-cli', 'template');
    const storeDir = path.resolve(userHome, '.s-cli', 'template', 'node_modules');
    const { npmName, version } = templateInfo;
    this.templateInfo = templateInfo;
    const templateNpm = new Package({
      targetPath,
      storeDir,
      packageName: npmName,
      packageVersion: version,
    });
    if (!(await templateNpm.exists())) {
      const spinner = await spinnerStart('下载模版中...');
      try {
        await sleep();
        await templateNpm.install();
      } catch (error) {
        throw error;
      } finally {
        spinner.stop(true);
        if (await templateNpm.exists()) {
          log.success('下载模版成功！');
          this.templateNpm = templateNpm;
        }
      }
    } else {
      const spinner = await spinnerStart('更新模版中...');
      try {
        await sleep();
        await templateNpm.update();
      } catch (error) {
        throw error;
      } finally {
        spinner.stop(true);
        console.log(await templateNpm.exists());
        if (await templateNpm.exists()) {
          log.success('更新模版成功！');
          this.templateNpm = templateNpm;
        }
      }
    }
  }

  async getProjectInfo() {
    function validateProjectName(v) {
      const r = /^[a-zA-Z]+([-][a-zA-Z][a-zA-Z0-9]*|[_][a-zA-Z][a-zA-Z0-9]*|[a-zA-Z0-9])*$/;
      return r.test(v);
    }
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

    this.template = this.template.filter(template => template.tag.includes(type));
    const title = type === TYPE_PROJECT ? '项目' : '组件';
    const prompt = [
      {
        name: 'projectVersion',
        type: 'input',
        message: `请输入${title}版本号`,
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
      {
        name: 'projectTemplate',
        type: 'list',
        message: `请选择${title}模版`,
        choices: this.createTemplateChoices(),
      },
    ];
    if (!validateProjectName(this.projectName)) {
      prompt.unshift({
        name: 'projectName',
        type: 'input',
        message: `请输入${title}名称`,
        default: '',
        validate(v) {
          // 1.首字符必须为英文字符
          // 2.尾字符必须为英文或数字
          // 3.字符仅允许为‘-_’

          const r = /^[a-zA-Z]+([-][a-zA-Z][a-zA-Z0-9]*|[_][a-zA-Z][a-zA-Z0-9]*|[a-zA-Z0-9])*$/;

          const done = this.async();
          setTimeout(() => {
            if (!r.test(v)) {
              done(`请输入正确${title}名称！字母开头且仅支持字母数字下划线 `);
              return;
            }
            done(null, true);
          }, 0);
        },
        filter(v) {
          return v;
        },
      });
    } else {
      projectInfo.projectName = this.projectName;
    }

    // 2.获取项目的基本信息
    if (type === TYPE_PROJECT) {
      // TODO
    } else if (type === TYPE_COMPONENT) {
      const desription = {
        name: 'componentDescription',
        type: 'component',
        message: `请输入组件描述信息`,
        default: '',
        validate(v) {
          const done = this.async();
          setTimeout(() => {
            if (!v) {
              done(`请输入组件描述信息`);
              return;
            }
            done(null, true);
          }, 0);
        },
      };
      prompt.push(desription);
    }

    const project = await inquirer.prompt(prompt);
    projectInfo = {
      ...projectInfo,
      type,
      ...project,
    };

    if (projectInfo.projectName) {
      projectInfo.name = projectInfo.projectName;
      projectInfo.className = require('kebab-case')(projectInfo.projectName).replace(/^-/, '');
    }
    if (projectInfo.projectVersion) {
      projectInfo.version = projectInfo.projectVersion;
    }

    if (projectInfo.componentDescription) {
      projectInfo.description = projectInfo.componentDescription;
    }
    // return Object(projectInfo)
    return projectInfo;
  }

  isDirEmpty(localPath) {
    let fileList = fs.readdirSync(localPath);
    // 文件过滤的逻辑
    fileList = fileList.filter(file => {
      return !file.startsWith('.') && ['node_modules'].indexOf(file) < 0;
    });
    return !fileList || fileList.length <= 0;
  }

  createTemplateChoices() {
    return this.template.map(item => {
      return {
        name: item.name,
        value: item.npmName,
      };
    });
  }
}

function init(argv) {
  return new InitCommand(argv);
}

module.exports = init;

module.exports.InitCommand = InitCommand;
