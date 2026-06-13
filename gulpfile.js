const { src, dest, parallel } = require('gulp');

function buildNodeIcons() {
  return src('nodes/**/*.{png,svg}')
    .pipe(dest('dist/nodes'));
}

// Credentials resolve 'file:' icons relative to their own compiled directory
// (dist/credentials/), so the PNG must also be copied there.
function buildCredentialIcons() {
  return src('nodes/Infisical/*.{png,svg}')
    .pipe(dest('dist/credentials'));
}

exports.build = parallel(buildNodeIcons, buildCredentialIcons);
exports.default = parallel(buildNodeIcons, buildCredentialIcons);
