const {BrowserWindow, app, Menu, Tray} = require('electron')

let appIcon = null

app.on('ready', () => {
  const win= new BrowserWindow({width:120,height:100})
  win.loadFile('index.html')
  const tray = new Tray( __dirname + '/static/tray_icon.png')
  tray.on('click',()=>{
    win.isVisible() ? win.hide() : win.show()
  })
  win.on('show',()=>{
    tray.setHighlightMode('always')
  })
  win.on('hide',()=>{
    tray.setHighlightMode('never')
  })

})
