const electron = require('electron')
const {ipcMain,BrowserWindow, app, Menu, Tray} = electron
var path = require('path')
let appIcon = null


app.on('ready', () => {
  
  const {width,height} =  electron.screen.getPrimaryDisplay().workAreaSize
  const win= new BrowserWindow({frame:false,resizeable:true, x:width-148,y:0,width:148, minWidth:148,maxWidth:148,height:125,minHeight:125,maxHeight:125,useContentSize:true,opacity:0.9, transparent:true, title:'squwbs',appIcon:__dirname + '/static/img/tray_icon.png',titleBarStyle:"default"})
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


