console.log('Versions:', process.versions);
try {
    const electron = require('electron');
    console.log('Electron require:', electron);
} catch (e) {
    console.error(e);
}
