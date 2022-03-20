'use strict';
const Comamnd = require('@s-cli/command');
const log = require('@s-cli/log');

class InitCommand extends Comamnd {
    init() {
        this.projectName = this._argv[0] || '';
        this.force = !!this._argv[1].force;
        log.verbose('projectName', this.projectName);
        log.verbose('force', this.force);
    }
    exec() {
        log.verbose('业务逻辑');
    }
}

function init(argv) {
    return new InitCommand(argv);
}

module.exports = init;

module.exports.InitCommand = InitCommand;
