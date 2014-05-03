/*jshint node:true*/

var AS3Parser = require('../lib/parser'),
    Emitter = require('../lib/emitter'),
    fs = require('fs'),
    path = require('path');

var parser = new AS3Parser();

var fileName = process.argv[2];

var content = fs.readFileSync(path.join(__dirname ,'single', fileName  + '.as'), 'UTF-8' );
var ast = parser.buildAst(fileName + '.as', content);
var emitter = new Emitter(ast, content);

fs.writeFileSync(path.join(__dirname ,'single', fileName  + '.ast.json'), JSON.stringify(ast, null, 4));
fs.writeFileSync(path.join(__dirname ,'single', fileName + '.ts'),  emitter.emit());

