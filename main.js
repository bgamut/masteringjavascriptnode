const electron = require('electron')
const {ipcMain,BrowserWindow, app, Menu, Tray} = electron
var path = require('path')
let appIcon = null


app.on('ready', () => {
  
  const {width,height} =  electron.screen.getPrimaryDisplay().workAreaSize
  const win= new BrowserWindow({resizeable:false, width:165, minWidth:165,maxWidth:165,height:97,minHeight:97,maxHeight:97,useContentSize:true,transparent:true, skipTaskebar:true, title:'squwbs',frame:true,x:width-165,y:0,appIcon:__dirname + '/static/img/tray_icon.png',titleBarStyle:"default"})
  win.loadFile('index.html')
  const tray = new Tray( __dirname + '/static/img/tray_icon.png')

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


