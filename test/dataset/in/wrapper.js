/**
 * @prettier
 */
'use strict';

/* Module Require */
const path = require('path');

/**
 * Wrapper of functions :
 */
const wrapper = {};

/**
 * io
 * - checkMime()
 * - read()
 * - createPath()
 * - write()
 */
wrapper.io = {
  'checkMime': function(fn, item, cb) {
    return fn(item.arguments.filePath, item.arguments.expectedMime, function(err, res) {
      if (err) return cb(err.toString());
      return cb(res);
    });
  },
  'read': function(fn, item, cb) {
    return fn(item.arguments.options, function(err, res) {
      if (err) return cb(err.toString());
      return cb(res);
    });
  },
  'createPath': function(fn, item, cb) {
    return cb(JSON.stringify(fn(item.arguments)));
  },
  'write': function(fn, item, cb) {
    return fn(item.arguments.options, function(err, res) {
      if (err) return cb(err.toString());
      return cb(res);
    });
  }
};

/**
 * JSON
 * - load()
 */
wrapper.JSON = {
  'load': function(fn, item, cb) {
    return fn(item.arguments.filePath, function(err, res) {
      if (err) return cb(err.toString());
      return cb(JSON.stringify(res));
    });
  }
};

/**
 * XML
 * - load()
 * - raw()
 */
wrapper.XML = {
  'load': function(fn, item, cb) {
    return fn(item.arguments.filePath, function(err, res) {
      if (err) return cb(err.toString());
      return cb(res('test').text());
    });
  },
  'raw': function(fn, item, cb) {
    return cb(fn(item.arguments.xmlString)('test').text());
  }
};

/**
 * URL
 * - addParameters()
 */
wrapper.URL = {
  'addParameters': function(fn, item, cb) {
    return cb(fn(item.arguments.url, item.arguments.parameters));
  }
};

/**
 * process
 * - transformXML()
 */
wrapper.process = {
  'transformXML': function(fn, item, cb) {
    return fn(item.arguments.options, function(err, res) {
      return cb(res.code);
    });
  }
};

/**
 * httpServices
 * - setFilesInFormdata()
 * - call()
 */
wrapper.httpServices = {
  'setFilesInFormdata': function(fn, item, cb) {
    return fn(item.arguments.files, item.arguments.formData, function(err, res) {
      if (err) return cb(err.toString());
      return cb(Object.keys(res));
    });
  },
  'call': function(fn, item, cb) {
    return fn(item.arguments.options, item.arguments.retry, function(err, res) {
      if (err) return cb(err.toString());
      return cb(res.httpResponse.statusCode);
    });
  }
};

module.exports = wrapper;
