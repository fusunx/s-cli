'use strict';
const axios = require('axios');

const BASE_URL = process.env.S_CLI_BASE_URL ? process.env.S_CLI_BASE_URL : 'http://127.0.0.1:7001';

const request = axios.create({
  baseURL: BASE_URL,
  timeout: 5000,
});

request.interceptors.response.use(
  res => {
    if (res.status === 200) {
      return res.data;
    } else {
      return Promise.reject(res);
    }
  },
  err => {
    return Promise.reject(err);
  }
);

module.exports = request;
