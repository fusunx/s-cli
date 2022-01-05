'use strict';
const { sep } = require('path');

function formatPath(p) {
    if (p) {
        console.log(sep);
        if (sep === '/') {
            return p;
        } else {
            return p.replace(/\\/g, '/');
        }
    }
    return p;
}

module.exports = formatPath;
