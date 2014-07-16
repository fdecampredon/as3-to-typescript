/*jshint node: true */

var fs = require('fs'),
    path = require('path'),
    AS3Parser = require('../lib/parser'),
    emitter = require('../lib/emitter');


var FIXTURES_DIR = path.join(__dirname,  'fixtures'),
    EXPECTED_DIR = path.join(FIXTURES_DIR, 'expected'),
    GENERATED_DIR = path.join(FIXTURES_DIR, 'generated');

function clear(dir) {
    var files = [];
    if(fs.existsSync(dir)) {
        files = fs.readdirSync(dir);
        files.forEach(function(file,index){
            var filePath = path.join(dir, file);
            if(fs.lstatSync(filePath).isDirectory()) { 
                clear(filePath);
            } else {
                fs.unlinkSync(filePath);
            }
        });
        fs.rmdirSync(dir);
    }
}

function recursiveCopy(dir, target) {
    var files = [];
    if(fs.existsSync(dir)) {
        if (!fs.existsSync(target)) {
            fs.mkdirSync(target);
        }
        files = fs.readdirSync(dir);
        files.forEach(function(file,index){
            var filePath = path.join(dir, file),
                targetPath = path.join(target, file);
            
            if(fs.lstatSync(filePath).isDirectory()) { 
                recursiveCopy(filePath, targetPath);
            } else {
                fs.linkSync(filePath, targetPath);
            }
        });
    }
}

function compile(callback) {
    var asFiles = fs.readdirSync(FIXTURES_DIR).filter(function (file) {
        return path.extname(file) === '.as';
    });

    var results = [];
    try {
        asFiles.forEach(function (file) {
            console.log('compiling : '+ file);
            var parser = new AS3Parser();
            var content = fs.readFileSync(path.join(FIXTURES_DIR, file), 'UTF-8');
            var ast = parser.buildAst(file, content);
            results.push({
                file: path.basename(file, '.as'),
                content: emitter.emit(ast, content)
            });
        });
    } catch(e) {
        callback(e);
    }
    callback(null, results);
}

function generate() {
    clear(GENERATED_DIR);
    fs.mkdirSync(GENERATED_DIR);
    compile(function (err, results) {
        if (err) {
            throw err;
        }
        results.forEach(function (fileResult){
            fs.writeFileSync(path.join(GENERATED_DIR, fileResult.file + '.ts'), fileResult.content); 
        });
    });
}

function acceptGenerated() {
    clear(EXPECTED_DIR);
    recursiveCopy(GENERATED_DIR, EXPECTED_DIR);
}

function compare() {
    var files = [];
    compile(function (err, results) {
        if (err) {
            throw err;
        }
        results.forEach(function (fileResult) {
            if (fileResult.content !== fs.readFileSync(path.join(EXPECTED_DIR, fileResult.file + '.ts'), 'UTF-8')) {
                throw new Error('compilation for file ' + fileResult.file + 
                                    '.as does not produce the expected result');
            }
        });
    });
}

var command = process.argv[2];
switch(command) {
    case 'generate':
        generate();
        break;
    case 'accept':
        acceptGenerated();
        break;
    case 'compare':
        compare();
        break;
    default:
        throw new Error('unknow command :' + command);
}
