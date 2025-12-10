const electron = require('electron');
console.log('Loaded electron:', electron);
console.log('Type of electron:', typeof electron);
if (typeof electron === 'object') {
    console.log('Keys:', Object.keys(electron));
    console.log('App available:', !!electron.app);
} else {
    console.log('Electron is NOT an object.');
}

console.log('Process versions:', process.versions);
console.log('Exec path:', process.execPath);
app.quit();
