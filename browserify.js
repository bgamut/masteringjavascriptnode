var browserify = require('browserify');
var through = require('through2');
var shasum = require('shasum');
var path = require('path')
var fs = require('fs')

var b = browserify(process.cwd() + '/index.js');

var hashes = {};
var hasher = through.obj(function (row, enc, next) {
    hashes[row.id] = shasum(row.source);
    this.push(row);
    next();
});
b.pipeline.get('deps').push(hasher);

var labeler = through.obj(function (row, enc, next) {
    row.id = hashes[row.id];
    
    Object.keys(row.deps).forEach(function (key) {
        row.deps[key] = hashes[row.deps[key]];
    });
    
    this.push(row);
    next();
});
b.pipeline.get('label').splice(0, 1, labeler);

var access = fs.createWriteStream(process.cwd() + '/bundle.js', { flags: 'w' });

b.bundle().pipe(process.stdout.pipe(access));
