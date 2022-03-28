'use strict';
const { sep } = require('path');

function formatPath(p) {
    if (p) {
        if (sep === '/') {
            return p;
        } else {
            return p.replace(/\\/g, '/');
        }
    }
    return p;
}

module.exports = formatPath;
