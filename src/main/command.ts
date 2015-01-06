/*jshint node:true*/

import AS3Parser = require('./parser');
import emitter = require('./emitter');
import fs = require('fs');
import path = require('path');

require('fs-extended')


var rimraf = require('rimraf');


function flatten<T>(arr: any): T[] {
  return arr.reduce(function (result: T[], val: any) {
    if (Array.isArray(val)) {
      result.push.apply(result, flatten(val));
    } else {
      result.push(val);
    }
    return result;
  }, <T[]>[]);
}

function readdir(dir: string, prefix = ''): string[] {
    return flatten<string>(fs.readdirSync(dir).map(function (file) {
        var fileName = path.join(prefix, file);
        var filePath = path.join(dir, file);
        return fs.statSync(filePath).isDirectory() ? <any> readdir(filePath, fileName) : <any> fileName;
    }));
}

function displayHelp() {
    console.log('usage: as3ToTypescript <sourceDir> <outputDir>');
}

export function run() {
    if (process.argv.length === 2) {
        displayHelp();
        process.exit(0);
    }
    if (process.argv.length !== 4) {
        throw new Error('source dir and output dir are mandatory');
        process.exit(1)
    }
    var sourceDir = path.resolve(process.cwd(), process.argv[2]);
    if (!fs.existsSync(sourceDir) || !fs.statSync(sourceDir).isDirectory()) {
        throw new Error('invalid source dir');
    }
    
    var outputDir = path.resolve(process.cwd(), process.argv[3]);
    if (fs.existsSync(outputDir)) {
        if (!fs.statSync(outputDir).isDirectory()) {
            throw new Error('invalid ouput dir');
            process.exit(1)
        } 
        rimraf.sync(outputDir);
    }
    fs.mkdirSync(outputDir);
    
    var files = readdir(sourceDir).filter(file => /.as$/.test(file));
    var number = 0;
    var length = files.length;
    files.forEach(function (file) {
        var parser = new AS3Parser();
        console.log('compiling \'' + file + '\' ' + number + '/' + length);
        var content = fs.readFileSync(path.resolve(sourceDir, file), 'UTF-8');
        console.log('parsing');
        var ast = parser.buildAst(path.basename(file), content);
        console.log('emitting');
        (<any>fs).createFileSync(path.resolve(outputDir, file.replace(/.as$/, '.ts')), emitter.emit(ast, content));
        number ++;
    });
}

