/**
 * @prettier
 */
'use strict';

/* Module Require */
const dateFormat = require('dateformat'),
  async = require('async'),
  cheerio = require('cheerio'),
  mkdirp = require('mkdirp'),
  mustache = require('mustache'),
  request = require('request'),
  isValidPath = require('is-valid-path'),
  isXML = require('is-xml'),
  mime = require('mime'),
  mmm = require('mmmagic'),
  Magic = mmm.Magic,
  magicMimeType = new Magic(mmm.MAGIC_MIME_TYPE),
  magicEncoding = new Magic(mmm.MAGIC_MIME_ENCODING),
  magicComplete = new Magic(),
  fs = require('fs'),
  path = require('path'),
  extend = require('util')._extend,
  child_process = require('child_process');

const ERROR = {
  'INPUT': {
    'UNDEFINED_EXPECTED_MIMETYPE': new Error('Mimetype is not definded'),
    'MIMETYPE_DO_NOT_MATCH': new Error('Mimetype do not match')
  },
  'OUTPUT': {
    'WRITE_FAIL': new Error('Unable to write data, missing options values')
  },
  'XML': {
    'IS_NOT_XML': new Error('File data is not a XML document'),
    'PARSE_FAIL': new Error('Parse of XML failed')
  }
};

// Main Object
const object = {};

// Regroup input's functions
object.io = {};

/**
 * Check MimeType of given file
 * @param {String} filePath Path of given File
 * @param {String} expectedMime Expected Mimetype
 * @param {function} cb Function called when procces end :
 *  - {Error} err Process erros
 *  - {String} res Returned MimeType
 * @return {undefined} Return undefined
 */
object.io.checkMime = function(filePath, expectedMime = null, cb) {
  let testedMime = mime.getType(filePath);
  if (!expectedMime) return cb(ERROR.INPUT.UNDEFINED_EXPECTED_MIMETYPE);
  if (!testedMime)
    return magicMimeType.detectFile(filePath, function(err, res) {
      if (err) return cb(err);
      if (expectedMime !== res) return cb(ERROR.INPUT.MIMETYPE_DO_NOT_MATCH);
      return cb(null, res);
    });
  if (expectedMime !== testedMime) return cb(ERROR.INPUT.MIMETYPE_DO_NOT_MATCH);
  return cb(null, testedMime);
};

/**
 * Read given file
 * @param {Object} options Object containing data required to process  :
 *  - {String} filePath Path of given File
 *  - {String} encoding Encoding of given File
 *  - {Object} mimeType Expected Mimetype (if this value is defined, object.io.checkMime function will be called)
 * @param {function} cb Function called when procces end :
 *  - {Error} err Process erros
 *  - {String} res Readed data
 * @return {undefined} Return undefined
 */
object.io.read = function(options = {}, cb) {
  if (options.mimeType) {
    return object.io.checkMime(options.filePath, options.mimeType, function(err, res) {
      if (err) return cb(err);
      return object.io._read(options.filePath, options.encoding, cb);
    });
  }
  return object.io._read(options.filePath, options.encoding, cb);
};

/**
 * Read given file
 * @param {String} filePath Path of given File
 * @param {String} encoding Encoding of given File
 * @param {function} cb Function called when procces end :
 *  - {Error} err Process erros
 *  - {String} res Readed data
 * @return {undefined} Return undefined
 */
object.io._read = function(filePath, encoding = 'utf8', cb) {
  // Read file
  return fs.readFile(filePath, encoding, function(err, res) {
    if (err) return cb(err);
    return cb(err, res);
  });
};

/**
 * Return data for object.io.write function
 *  - directory => [outputDirectory]/[id]/
 *  - filename => [id].([label].)[extension]
 * @param {Object} options Object containing data required to process :
 *  - {String} outputDirectory Output Directory
 *  - {String} id Id of document (could be a md5 hash for example)
 *  - {String} label Label of process that use this library (for example : myProcess)
 *  - {String} extension File extension (for example : .tei.xml)
 * @return {Object} File Infos, like : { filemane, directory }
 */
object.io.createPath = function(options = {}) {
  let result = null;
  if (options && options.id) {
    result = {
      'directory': path.join(options.outputDirectory, options.label),
      'filename': options.id + (options.label ? '.' : '') + options.label + options.extension
    };
  }
  return result;
};

/**
 * Write given file
 * @param {Object} options Object containing data required to process  :
 *  - {String} template Template content or path of template file (if template is path of file, it will be automatically loaded)
 *  - {Object|String} data Data that will fill template, or simply data which will be written
 *  - {Object} output Output data (use : object.io.createPath function)
 * @param {function} cb Function called when procces end :
 *  - {Error} err Process erros
 *  - {String} res Writed data
 * @return {undefined} Return undefined
 */
object.io.write = function(options = {}, cb) {
  // Will create subdirectories if needed
  return mkdirp(options.output.directory, function(err, made) {
    if (err) return cb(err);
    let filePath = path.join(options.output.directory, options.output.filename);
    if (typeof options.template === 'undefined' && typeof options.data === 'string') {
      // case data is a string (no template need to be loaded)
      return object.io._write(filePath, options.encoding, options.data, cb);
    }
    if (options.template) {
      if (isValidPath(options.template)) {
        // case template must be loaded
        return object.io._read(options.template, options.encoding, function(err, res) {
          if (err) return cb(err);
          let fragment = mustache.render(res, options.data);
          return object.io._write(filePath, options.encoding, fragment, cb);
        });
      }
      // case template is already loaded
      let fragment = mustache.render(options.template, options.data);
      return object.io._write(filePath, options.encoding, fragment, cb);
    }
    return cb(ERROR.OUTPUT.WRITE_FAIL);
  });
};

/**
 * Write given file
 * @param {String} filePath Path of given File
 * @param {String} encoding Encoding of given File
 * @param {function} cb Function called when procces end :
 *  - {Error} err Process erros
 *  - {String} res Writed data
 * @return {undefined} Return undefined
 */
object.io._write = function(filePath, encoding = 'utf8', data, cb) {
  // Write file
  return fs.writeFile(filePath, data, encoding, function(err) {
    if (err) data = null;
    return cb(err, data);
  });
};

// Regroup JSON's functions
object.JSON = {};

/**
 * Parse content of given JSON file
 * @param {String} filePath Path of given File
 * @param {function} cb Function called when procces end :
 *  - {Error} err Process erros
 *  - {String} res Writed data
 * @return {undefined} Return undefined
 */
object.JSON.load = function(filePath, cb) {
  return object.io.read({ 'filePath': filePath, 'mimeType': 'application/json' }, function(err, data) {
    if (err) return cb(err);
    try {
      let result = JSON.parse(data);
      return cb(null, result);
    } catch (e) {
      return cb(e);
    }
  });
};

// Regroup XML's functions
object.XML = {};

/**
 * Parse content of given XML file
 * @param {String} filePath Path of given File
 * @param {function} cb Function called when procces end :
 *  - {Error} err Process erros
 *  - {String} res Writed data
 * @return {undefined} Return undefined
 */
object.XML.load = function(filePath, cb) {
  return object.io.read({ 'filePath': filePath, 'mimeType': 'application/xml' }, function(err, res) {
    if (err) return cb(err);
    if (!isXML(res)) return cb(ERROR.XML.IS_NOT_XML);
    const result = object.XML.raw(res);
    if (Object.keys(result).length === 0) return cb(ERROR.XML.PARSE_FAIL);
    return cb(null, result);
  });
};

/**
 * Parse content of given XML file
 * @param {String} xmlString String representation of an XML document
 * @return {undefined} Return undefined
 */
object.XML.raw = function(xmlString) {
  return cheerio.load(xmlString, {
    'xmlMode': true
  });
};

// Regroup URL's functions
object.URL = {};

/**
 * Build URL for GET request
 * @param {String} url URL part before '?'
 * @param {Object} parameters Parameters that will be added (after '?')
 * @return {String} Complete URL
 */
object.URL.addParameters = function(url, parameters = {}) {
  const keys = Object.keys(parameters),
    separator = '&';
  let result = '?';
  for (let i = 0; i < keys.length; i++) {
    result += keys[i] + '=' + encodeURIComponent(parameters[keys[i]]) + (i < keys.length - 1 ? '&' : '');
  }
  return url + result;
};

// Regroup dates' functions
object.dates = {};

/**
 * Return now date
 * @param {String} format Date format (by default 'dd-mm-yyyy')
 * @return {String} Formated date
 */
object.dates.now = function(format = 'dd-mm-yyyy') {
  return dateFormat(new Date(Date.now()), format);
};

// Regroup httpServices' functions
object.httpServices = {};

/**
 * Build formData with given files
 * @param {Object} files Object containing files (like 'key': 'path')
 * @param {Object} formData FormData that already exist
 * @param {function} cb Function called when procces end :
 *  - {Error} err Process erros
 *  - {Object} res Response, like :
 *    - {Object} httpResponse HTTP response
 *    - {String} body Body of HTTP response
 * @return {undefined} Return undefined
 */
object.httpServices.setFilesInFormdata = function(files = {}, formData = {}, cb) {
  let _err = null;
  return async.each(
    Object.keys(files),
    function(key, callback) {
      const filename = files[key];
      // Vérification de l'existence du fichier à envoyer
      return fs.stat(filename, function(err, stats) {
        // Lecture impossible
        if (err) return callback(err);
        // Création du form data
        formData[key] = fs.createReadStream(filename);
        return callback();
      });
    },
    function(err) {
      if (err) return cb(err);
      return cb(_err, formData);
    }
  );
};

/**
 * call given service (with HTTP request). In case of failure, request will be retry as many times as configured
 * @param {Object} options Object containing information needed to create an HTTP request :
 *  - {String} method HTTP Method
 *  - {String} HTTP_STATUS_RETRY Regex matching HTTPS Status that will trigger a retry (ex : 403, mais pas le 200 normalement?!)
 *  - {Object} formData FormData of HTTP Request
 *  - {Object} headers Headers of HTTP Request
 *  - {String} url Url of HTTP Service
 * @param {Object} retry Retry paramters :
 *  - {Integer} times number of tests
 *  - {Integer} interval Timeout between each retry
 * @param {function} cb Function called when procces end :
 *  - {Error} err Process erros
 *  - {Object} res Response, like :
 *    - {Object} httpResponse HTTP response
 *    - {String} body Body of HTTP response
 * @return {undefined} Return undefined
 */
object.httpServices.call = function(options = {}, retry = null, cb) {
  let _err = null;
  // Init Retry
  if (!retry)
    retry = {
      'times': 1,
      'interval': 200
    };
  // Init formData
  if (!options.formData) options.formData = {};
  // Create Regex
  const HTTP_STATUS_RETRY = options.HTTP_STATUS_RETRY
    ? new RegExp(options.HTTP_STATUS_RETRY)
    : new RegExp('^4[0-9]{2}$');
  // Start request
  return async.retry(
    retry,
    // Callback function
    function(callback, results) {
      return request(
        {
          method: options.method,
          headers: options.headers,
          url: options.url,
          formData: options.formData
        },
        function(err, httpResponse, body) {
          if (err) return callback(null, err);
          // Case of failure :
          if (httpResponse.statusCode.toString().match(HTTP_STATUS_RETRY))
            return callback(true, {
              httpResponse,
              body
            });
          return callback(null, {
            httpResponse,
            body
          });
        }
      );
    },
    // Result of retry
    /*
     * err can only be equal to :
     * - true : the retry failed so there is the last HTTP Response in result
     * - null : result will contain an Error (in case of unavailable service) or an HTTP Response (retry works)
     */
    function(err, result) {
      // Service error
      if (!result.httpResponse) {
        _err = new Error(result);
        return cb(_err, result);
      }
      return cb(_err, result);
    }
  );
};

// Regroup process' functions
object.process = {};

/**
 * Process XSLT file on given file (using shell)
 * @param {Object} options Object containing information needed to create command line :
 *  - {String} output XSLT file
 *  - {String} documentId Data inserted in XML File
 *  - {String} runId Output data (see object.io.createPath function)
 *  - {String} xsltFile Path of XSLT File
 *  - {String} xmlFile Path of XML File
 * @param {function} cb Function called when procces end :
 *  - {Error} err Process erros
 *  - {Object} res Result of Command Line, like
 *    - {Object} logs stderr logs (array) and stdout logs (array)
 *    - {Array} output Array containing differents logs (latest to newest)
 *    - {Integer} code Exit Code
 * @return {undefined} Return undefined
 */
object.process.transformXML = function(options = {}, cb) {
  // Spawn
  const xsltproc = child_process.spawn('xsltproc', [
      '--output',
      options.output,
      '--stringparam',
      'documentId',
      options.documentId,
      '--stringparam',
      'runId',
      options.runId,
      options.xsltFile,
      options.xmlFile
    ]),
    _err = null,
    logs = {
      'stderr': [],
      'stdout': []
    },
    output = [];

  // Write stdout in Logs
  xsltproc.stdout.on('data', function(data) {
    const str = data.toString();
    logs.stdout.push(str);
    return output.push('[stdout] ' + str);
  });

  // Write stderr in Logs
  xsltproc.stderr.on('data', function(data) {
    const str = data.toString();
    logs.stderr.push(str);
    return output.push('[stderr] ' + data.toString());
  });

  // On error
  xsltproc.on('error', function(err) {
    const res = {
      'logs': logs,
      'output': output
    };
    return cb(err, res);
  });

  // On close
  xsltproc.on('close', function(code) {
    const res = {
      'logs': logs,
      'output': output,
      'code': code
    };
    return cb(null, res);
  });
};

module.exports = object;
