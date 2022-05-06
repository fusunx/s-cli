'use strict';

function isObject(o) {
  return Object.prototype.toString.call(o) === '[object Object]';
}

function spinnerStart(msg = 'loading...', spinnerString = '|/-\\') {
  const Spinner = require('cli-spinner').Spinner;
  const spinner = new Spinner(msg + ' %s');
  spinner.setSpinnerString(spinnerString);
  spinner.start();
  return spinner;
}

function sleep(timeout = 1000) {
  return new Promise((resolve, reject) => setTimeout(resolve, timeout));
}

function exec(command, args, options) {
  const win32 = process.platform === 'win32';

  command = win32 ? 'cmd' : command;
  args = win32 ? ['/c'].concat(command, args) : args;

  return require('child_process').spawn(command, args, options || {});
}

function execAsync(command, args, options) {
  return new Promise((resolve, reject) => {
    const p = exec(command, args, options);
    p.on('error', e => {
      reject(e);
    });
    p.on('exit', c => {
      resolve(c);
    });
  });
}

module.exports = { isObject, spinnerStart, sleep, exec, execAsync };
