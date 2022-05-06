'use strict';
const path = require('path');
const pkgDir = require('pkg-dir').sync;
const npminstall = require('npminstall');
const pathExists = require('path-exists');
const fse = require('fs-extra');
const { isObject } = require('@s-cli/utils');
const formatPath = require('@s-cli/format-path');
const { getDefaultRegistry, getNpmLatestVersion } = require('@s-cli/get-npm-info');

class Package {
  constructor(options) {
    if (!options) {
      throw new Error('Package 类的 options 不能为空');
    }

    if (!isObject(options)) {
      throw new Error('Package 类的 options 参数必须为对象');
    }

    // package 的路径
    this.targetpath = options.targetPath;
    // 缓存 package 的路径
    this.storeDir = options.storeDir;
    // package 的 name
    this.packageName = options.packageName;
    // package 的 version
    this.packageVersion = options.packageVersion;
    // package 的缓存目录前缀
    this.cacheFilePathPrefix = this.packageName.replace('/', '_');
  }

  async prepare() {
    if (this.storeDir && !(await pathExists(this.storeDir))) {
      fse.mkdirpSync(this.storeDir);
    }
    if (this.packageVersion === 'latest') {
      this.packageVersion = await getNpmLatestVersion(this.packageName);
    }
  }

  get cacheFilePath() {
    return path.resolve(
      this.storeDir,
      `_${this.cacheFilePathPrefix}@${this.packageVersion}@${this.packageName}`
    );
  }

  getSpecificCacheFilePath(packageVersion) {
    return path.resolve(
      this.storeDir,
      `_${this.cacheFilePathPrefix}@${packageVersion}@${this.packageName}`
    );
  }

  // 判断当前 Package 是否存在
  async exists() {
    if (this.storeDir) {
      await this.prepare();
      return await pathExists(this.cacheFilePath);
    } else {
      return await pathExists(this.targetpath);
    }
  }

  // 安装 Package
  async install() {
    await this.prepare();
    return await npminstall({
      root: this.targetpath,
      storeDir: this.storeDir,
      registry: getDefaultRegistry(),
      pkgs: [
        {
          name: this.packageName,
          version: this.packageVersion,
        },
      ],
    });
  }

  // 更新 Package
  async update() {
    await this.prepare();
    // 获取最新的 npm 模块版本号
    const latestPackageVersion = await getNpmLatestVersion(this.packageName);
    // 查询最新版本号对应路径是否存在
    const latestFilePath = this.getSpecificCacheFilePath(latestPackageVersion);
    console.log(
      'latestPackageVersion: ',
      latestPackageVersion,
      latestFilePath,
      await pathExists(latestFilePath)
    );
    // 如果不存在，则直接安装最新版本
    if (!(await pathExists(latestFilePath))) {
      await npminstall({
        root: this.targetpath,
        storeDir: this.storeDir,
        registry: getDefaultRegistry(),
        pkgs: [
          {
            name: this.packageName,
            version: latestPackageVersion,
          },
        ],
      });
      this.packageVersion = latestPackageVersion;
      return;
    } else {
      this.packageVersion = latestPackageVersion;
    }
    return latestFilePath;
  }

  // 获取入口文件路径
  getRootFile() {
    function _getRootFile(targetpath) {
      // 1. 获取 package.json 所在目录 - pkg-dir 库
      const dir = pkgDir(targetpath);
      if (dir) {
        // 2. 读取 package.json - require()
        const pkgFile = require(path.resolve(dir, 'package.json'));
        // 3. 寻找 main/lib - path
        if (pkgFile && pkgFile.main) {
          // 4. 路径兼容 mac/Windows
          return formatPath(path.resolve(dir, pkgFile.main));
        }
      }
      return null;
    }
    if (this.storeDir) {
      return _getRootFile(this.cacheFilePath);
    } else {
      return _getRootFile(this.targetpath);
    }
  }
}

module.exports = Package;
