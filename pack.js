const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const browser = process.argv[2];
const version = process.env.npm_package_version;
const fileExt = browser === 'firefox' ? 'xpi' : 'zip';

const archPath = path.join(__dirname,
    `/releases/midnight-lizard-${version}-${browser}.${fileExt}`);
const output = fs.createWriteStream(archPath);
const archive = archiver('zip', { zlib: { level: 9 } });

archive.file(`manifest/${browser}/manifest.json`, { name: 'manifest.json' });
archive.file('LICENSE');
archive.directory('css/');
archive.directory('img/');
archive.directory('js/');
archive.directory('ui/');
archive.directory('_locales/');

archive.pipe(output);
archive.finalize();