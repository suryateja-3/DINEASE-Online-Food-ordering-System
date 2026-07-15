const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '../src/main/resources/static/index.html');
const dest = path.join(__dirname, '../src/main/resources/templates/index.html');

if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    fs.unlinkSync(src);
    console.log('Moved index.html to templates/index.html');
} else {
    console.error('Source index.html not found at: ' + src);
}
