const fs = require('fs')
const path = require('path')
const { app, BrowserWindow, ipcMain } = require('electron')

// App global variables
let mainWindow
let version = '1.0.0'
let newVersion
const projectDirName = '<%= props.projectDirName %>'
const projectName = '<%= props.projectName %>'
const currentDir = '<%= props.currentDir %>'

app.on('ready', () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    frame: false,
    icon: path.resolve(__dirname, 'assets/logo.png'),
    webPreferences: {
      nodeIntegration: true
    }
  })

  // Disable menu
  mainWindow.setMenuBarVisibility(false)
  mainWindow.setAutoHideMenuBar(true)
  mainWindow.maximize()

  /// Open index.html
  mainWindow.loadFile(path.resolve(__dirname, 'index.html'))
})

// Catch when close button has beign trigger
ipcMain.on('app:quit', () => {
  app.quit()
})

// Catch page load, and send the last diagram json
ipcMain.on('page:load', () => {
  let latestJson

  // Ensure that the directory is created
  if (!fs.existsSync(path.resolve(currentDir, projectDirName))) {
    fs.mkdirSync(path.resolve(currentDir, projectDirName))
  } else {
    const files = fs.readdirSync(path.resolve(currentDir, projectDirName))

    // Gets the latest file version name;
    for (let index = 0; index < files.length; index++) {
      const file = files[index]
      const fileVersion = file.replace('.json', '')

      // If current version is less then fileVersion
      if (compareVersion(version, fileVersion) == -1) {
        version = fileVersion
      }
    }

    if (
      fs.existsSync(path.resolve(currentDir, projectDirName, `${version}.json`))
    ) {
      // Gets the data from the latest version
      latestJson = fs.readFileSync(
        path.resolve(currentDir, projectDirName, `${version}.json`),
        { encoding: 'utf8' }
      )
    }
  }

  mainWindow.webContents.send('page:load', latestJson, projectName)
})

// Update version if has change properties and version
// hasn´t being updated
ipcMain.on('change', (e, json) => {
  if (version != newVersion) {
    updateVersion()
  }

  fs.writeFileSync(
    path.resolve(currentDir, `${projectDirName}/${version}.json`),
    json
  )
})

// If has only change position then just update the json
ipcMain.on('change:position', (e, json) => {
  fs.writeFileSync(
    path.resolve(currentDir, `${projectDirName}/${version}.json`),
    json
  )
})

function updateVersion() {
  let currentVersionArray = version.split('.')
  let value = currentVersionArray[currentVersionArray.length - 2]

  // increase version
  currentVersionArray[currentVersionArray.length - 2] = parseInt(value) + 1

  version = currentVersionArray.join('.')
  newVersion = version
}

// Return 1 if a > b
// Return -1 if a < b
// Return 0 if a == b
function compareVersion(a, b) {
  if (a === b) {
    return 0
  }

  var a_components = a.split('.')
  var b_components = b.split('.')

  var len = Math.min(a_components.length, b_components.length)

  // loop while the components are equal
  for (var i = 0; i < len; i++) {
    // A bigger than B
    if (parseInt(a_components[i]) > parseInt(b_components[i])) {
      return 1
    }

    // B bigger than A
    if (parseInt(a_components[i]) < parseInt(b_components[i])) {
      return -1
    }
  }

  // If one's a prefix of the other, the longer one is greater.
  if (a_components.length > b_components.length) {
    return 1
  }

  if (a_components.length < b_components.length) {
    return -1
  }

  // Otherwise they are the same.
  return 0
}
