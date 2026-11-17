const fs = require('fs');
const path = require('path');
const archiverModule = require('archiver');
const archiver = archiverModule.default || archiverModule;

const distPath = path.resolve(__dirname, '../dist');
const zipPath = path.resolve(__dirname, '../dist-upload.zip');

if (!fs.existsSync(distPath)) {
  console.error('Error: dist directory does not exist! Please run "npm run build" first.');
  process.exit(1);
}

const output = fs.createWriteStream(zipPath);
const archive = typeof archiver === 'function'
  ? archiver('zip', { zlib: { level: 9 } })
  : new archiverModule.ZipArchive({ zlib: { level: 9 } });

output.on('close', function () {
  console.log(`[fox3 Packager] Successfully packed ${archive.pointer()} total bytes.`);
  console.log(`[fox3 Packager] Deployment Zip created at: ${zipPath}`);
});

archive.on('error', function (err) {
  throw err;
});

archive.pipe(output);
archive.directory(distPath, false);
archive.finalize();
