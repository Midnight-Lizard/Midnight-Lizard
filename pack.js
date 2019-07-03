const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const browser = process.argv[2];
const version = process.env.npm_package_version;
const fileExt = browser === 'firefox' ? 'xpi' : 'zip';
const releasesDir = path.join(__dirname, 'releases');

if (!fs.existsSync(releasesDir)) {
    fs.mkdirSync(releasesDir);
}

const archPath = path.join(releasesDir, `/midnight-lizard-${version}-${browser}.${fileExt}`);
const output = fs.createWriteStream(archPath);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
    console.log(`${archive.pointer()} total bytes have been written to ${output.path}`);
    console.log('archiver has been finalized and the output file descriptor has closed.');
});

archive.pipe(output);
archive.file(`manifest/${browser}/manifest.json`, { name: 'manifest.json' });
archive.file('LICENSE');
archive.directory('css/');
archive.directory('img/');
archive.directory('js/');
archive.directory('ui/');
archive.directory('_locales/');
archive.finalize();