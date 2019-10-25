/**
 * @prettier
 */
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
  'io': require('./dataset/in/data/io.json'),
  'JSON': require('./dataset/in/data/JSON.json'),
  'XML': require('./dataset/in/data/XML.json'),
  'URL': require('./dataset/in/data/URL.json'),
  'process': require('./dataset/in/data/process.json'),
  'httpServices': require('./dataset/in/data/httpServices.json')
};

// Map of functions used in test
const wrapper = require('./dataset/in/wrapper.js');

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
 * Start test
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
