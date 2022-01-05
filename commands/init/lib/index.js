'use strict';

function init(projectName, options, command) {
    console.log(111);
    console.log('init', projectName, options, process.env.CLI_TARGET_PATH);
}

module.exports = init;
