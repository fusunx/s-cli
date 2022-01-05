'use strict';

const axios = require('axios');
const semver = require('semver');
const urlJoin = require('url-join');

function getNpmInfo(npmName, registry) {
    if (!npmName) {
        return null;
    }

    const registryUrl = registry || getDefaultRegistry();
    const npmInfoUrl = urlJoin(registryUrl, npmName);
    return axios
        .get(npmInfoUrl)
        .then((response) => {
            if (response.status === 200) {
                return response.data;
            } else {
                return null;
            }
        })
        .catch((e) => {
            return Peomise.reject(e);
        });
}

function getDefaultRegistry(isOriginal = true) {
    return isOriginal ? 'https://registry.npmjs.org' : 'https://registry.npm.taobao.org';
}

async function getNpmVersions(npmName, registry) {
    const data = await getNpmInfo(npmName, registry);
    if (data) {
        return Object.keys(data.versions);
    } else {
        return [];
    }
}

function getNpmSemverVersions(baseVersion, versions) {
    return versions
        .filter((version) => semver.satisfies(version, `^${baseVersion}`))
        .sort((a, b) => semver.gt(b, a));
}

async function getNpmSemverVersion(baseVersion, npmName, registry) {
    const versions = await getNpmVersions(npmName, registry);
    const newVersions = getNpmSemverVersions(baseVersion, versions);
    if (newVersions && newVersions.length > 0) {
        return newVersions[0];
    }
    return null;
}

async function getNpmLatestVersion(npmName, registry) {
    const versions = await getNpmVersions(npmName, registry);
    if (versions) {
        return versions.sort((a, b) => semver.gt(b, a))[0];
    }
    return null;
}

module.exports = {
    getNpmInfo,
    getNpmVersions,
    getNpmSemverVersion,
    getDefaultRegistry,
    getNpmLatestVersion,
};
