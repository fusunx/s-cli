const request = require('@s-cli/request');

module.exports = function () {
  return request({
    url: '/project/template',
  });
};
