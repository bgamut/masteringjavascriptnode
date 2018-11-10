const electron = require('electron')
const {ipcMain,BrowserWindow, app, Menu, Tray} = electron
var path = require('path')
let appIcon = null


app.on('ready', () => {
  
  const {width,height} =  electron.screen.getPrimaryDisplay().workAreaSize
  const win= new BrowserWindow({width:125,height:100, transparent:true, skipTaskebar:true, title:'squwbs',frame:true,x:width-125,y:0,appIcon:__dirname + '/static/tray_icon.png'})
  win.loadFile('index.html')
  const tray = new Tray( __dirname + '/static/tray_icon.png')

  tray.on('click',()=>{
    win.isVisible() ? win.hide() : win.show()
  })
  win.on('show',()=>{
    tray.setHighlightMode('never')

  })
  win.on('hide',()=>{
    tray.setHighlightMode('never')
  })

})


