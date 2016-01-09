require('./boot.js');

var gulp = require("gulp");
var mocha = require('gulp-mocha');

gulp.src('build/**/*.test.js', {
    read: false
  })
  .pipe(mocha());