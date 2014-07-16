/*jshint node:true*/

var AS3Parser = require('../lib/parser'),
    emitter = require('../lib/emitter'),
    fs = require('fs'),
    path = require('path');

var parser = new AS3Parser();


var content = fs.readFileSync(path.join(__dirname ,'single', 'file.as'), 'UTF-8' );
var ast = parser.buildAst('file.as', content);

fs.writeFileSync(path.join(__dirname ,'single', 'file.ast.json'), JSON.stringify(ast, null, 4));
fs.writeFileSync(path.join(__dirname ,'single', 'file.ts'),  emitter.emit(ast, content));

