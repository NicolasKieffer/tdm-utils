/* global __dirname, require, process, it */
'use strict';

const pkg = require('../package.json'),
  myObject = require('../index.js'),
  supertest = require('supertest'),
  TU = require('auto-tu'),
  fs = require('fs'),
  path = require('path');

let server,
  request,
  serverFile = path.resolve('./test/server.js');

// Test data
const dataset = {
  'input': require('./dataset/in/data/input.json'),
  'output': require('./dataset/in/data/output.json'),
  'JSON': require('./dataset/in/data/JSON.json'),
  'XML': require('./dataset/in/data/XML.json'),
  'URL': require('./dataset/in/data/URL.json'),
  'process': require('./dataset/in/data/process.json'),
  'httpServices': require('./dataset/in/data/httpServices.json')
};

// Map of functions used in test
const wrapper = {
  'input': {
    'checkMime': testOf_inputCheckMime,
    'read': testOf_inputRead
  },
  'output': {
    'createPath': testOf_outputCreatePath,
    'write': testOf_outputWrite
  },
  'JSON': {
    'load': testOf_jsonLoad
  },
  'XML': {
    'load': testOf_xmlLoad
  },
  'URL': {
    'addParameters': testOf_urlAddParameters
  },
  'process': {
    'transformXML': testOf_processTransformXML
  },
  'httpServices': {
    'setFilesInFormdata': testOf_httpServicesSetFilesInFormdata,
    'call': testOf_httpServicesCall
  }
};

// Mapping indiquant quelle fonction de test et quel beforeEach utiliser pour chaque fonction
const before = {
  'httpServices': {
    'call': function(done) {
      server = require(serverFile).listen(8888, done);
      request = supertest.agent(server);
    }
  }
};

// Mapping indiquant quelle fonction de test et quel afterEach utiliser pour chaque fonction
const after = {
  'httpServices': {
    'call': function(done) {
      server.close(done);
    }
  }
};

TU.which({
  'packages': ['xsltproc']
});

/**
 * Test de chaques fonctions de :
 *
 * - myObject.input
 *   - checkMime()
 *   - read()
 *
 * - myObject.output.
 *   - createPath()
 *   - write()
 *
 * - myObject.JSON.
 *   - load()
 *
 * - myObject.XML.
 *   - load()
 *   - select()
 *
 * - myObject.URL.
 *   - addParameters()
 *
 * - myObject.process.
 *   - transformXML()
 *
 * - myObject.httpServices.
 *   - setFilesInFormdata()
 *   - call()
 */
TU.start({
  'description': pkg.name + '/index.js',
  'root': 'myObject',
  'object': myObject,
  'dataset': dataset,
  'wrapper': wrapper,
  'before': before,
  'after': after
});

/**
 * Fonction de test à appliquée pour :
 * - myObject.input.checkMime()
 */
function testOf_inputCheckMime(fn, item, cb) {
  return fn(item.arguments.filePath, item.arguments.expectedMime, function(err, res) {
    if (err) return cb(err.toString());
    return cb(res);
  });
}

/**
 * Fonction de test à appliquée pour :
 * - myObject.input.read()
 */
function testOf_inputRead(fn, item, cb) {
  return fn(item.arguments.options, function(err, res) {
    if (err) return cb(err.toString());
    return cb(res);
  });
}

/**
 * Fonction de test à appliquée pour :
 * - myObject.output.createPath()
 */
function testOf_outputCreatePath(fn, item, cb) {
  return cb(JSON.stringify(fn(item.arguments)));
}

/**
 * Fonction de test à appliquée pour :
 * - myObject.output.write()
 */
function testOf_outputWrite(fn, item, cb) {
  return fn(item.arguments.options, function(err, res) {
    if (err) return cb(err.toString());
    return cb(res);
  });
}

/**
 * Fonction de test à appliquée pour :
 * - myObject.JSON.load()
 */
function testOf_jsonLoad(fn, item, cb) {
  return fn(path.join(__dirname, item.filePath), function(err, res) {
    if (err) return cb(err.toString());
    return cb(JSON.stringify(res));
  });
}

/**
 * Fonction de test à appliquée pour :
 * - myObject.XML.load()
 */
function testOf_xmlLoad(fn, item, cb) {
  return fn(path.join(__dirname, item.filePath), function(err, res) {
    if (err) return cb(err.toString());
    return cb(res('test').text());
  });
}

/**
 * Fonction de test à appliquée pour :
 * - myObject.URL.addParameters()
 */
function testOf_urlAddParameters(fn, item, cb) {
  return cb(fn(item.arguments.url, item.arguments.parameters));
}

/**
 * Fonction de test à appliquée pour :
 * - myObject.process.transformXML()
 */
function testOf_processTransformXML(fn, item, cb) {
  return fn(item.arguments.options, function(err, res) {
    return cb(res.code);
  });
}

/**
 * Fonction de test à appliquée pour :
 * - myObject.httpServices.setFilesInFormdata()
 */
function testOf_httpServicesSetFilesInFormdata(fn, item, cb) {
  return fn(item.arguments.files, item.arguments.formData, function(err, res) {
    if (err) return cb(err.toString());
    return cb(Object.keys(res));
  });
}

/**
 * Fonction de test à appliquée pour :
 * - myObject.httpServices.call()
 */
function testOf_httpServicesCall(fn, item, cb) {
  return fn(item.arguments.options, item.arguments.retry, function(err, res) {
    if (err) return cb(err.toString());
    return cb(res.httpResponse.statusCode);
  });
}

// Set une regex pour chaque clée demandée
function setRegex(keys, options) {
  for (let i = 0; i < keys.length; i++) {
    if (options instanceof Array) {
      for (let j = 0; j < options.length; j++) {
        options[j][keys[i]] = new RegExp(options[j][keys[i]]);
      }
    } else {
      options[keys[i]] = new RegExp(options[keys[i]]);
    }
  }
}
