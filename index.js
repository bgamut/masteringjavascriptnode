/*
'use strict'
var read = require('file-reader')
var xml = require('xml-parse')
var a= read('reference.wav')
var b=xml.parse('<?xml version="1.0" encoding="UTF-8"?>')
var reader = require ("buffered-reader")
var fs = require("fs")
var BinaryReader = reader.BinaryReader;
var DataReader = reader.DataReader;
 
var file = "test.wav";
var offset;
fs.readFile(file,function(e,data){
    var a=data.buffer
    var bufferLength=(a.byteLength-44)/2
    console.log(bufferLength)
    var dataView = new DataView(a)
    var int8View = new Int8Array(a)
    var channels = int8View[22]
    var bits=int8View[34]

    var newLeft = new Array(bufferLength);
    var newRight = new Array(bufferLength);
    console.log('bits:'+bits)
    //assume 78 to be the first sample of the file buffer
    
    for (var i=44;i<=bufferLength;i+=4){
    //last sample index start = a.byteLength - 4 
    //left sample    
        var index=(i-40)/4;
        var lefthigh=dataView.getInt8(i).toString(16)
        var leftlow=dataView.getInt8(i+1).toString(16)
        var hexaleft="0x"+lefthigh+leftlow
        var left=parseInt(hexaleft,16);

    //right sample
        var righthigh=dataView.getInt8(i+2).toString(16)
        var rightlow=dataView.getInt8(i+3).toString(16)
        var hexaright="0x"+righthigh+rightlow
        var right=parseInt(hexaright,16)

        newLeft[index]=left;
        newRight[index]=right;

    }
    
    // if buffer is empty replace with 0
    for (var i=0;i<=bufferLength;i++){
        if(isNaN(newLeft[i])){
            newLeft[i]=0;
        }
        if(isNaN(newRight[i])){
            newRight[i]=0;
        }
    }
    
    console.log("left: "+newLeft[bufferLength-1])
    console.log("right: "+newRight[bufferLength-1])
    console.log("last sample index: "+(a.byteLength-44)/2)
    
    console.log(newLeft)

})
*/
var WaveFile=require("wavefile")
var fs= require("fs");
var ooura = require('ooura');

fs.readFile("test.wav",function(e,data){
    if(e){ 
        throw e;
    }
    var buffer = data;
    var wav= new WaveFile(buffer);
    wav.toBitDepth('16');
    var leftCh=new Array();
    var rightCh=new Array();
    var monoCh=new Array();
    'wav.fromIMAADPCM();'
    var wavData = wav.toBuffer();
    var byteRate = String(wav.fmt.byteRate);
    var numChannels = wav.fmt.numChannels;
    var samples = wav.data.samples;
    var sampleRate=wav.fmt.sampleRate;
    'console.log(wavData)'
    console.log(samples)
    for (i=0; i<wavData.length/2; i++){
        leftCh[i]=wavData[i*2]
        rightCh[i]=wavData[i*2+1]
        monoCh[i]=leftCh[i]/2+rightCh[i]/2
    }

    console.log(samples)
    var new_wav=new WaveFile();
    "new_wav.fromScratch(2,41100,'24',newLeft,newRight);"
    new_wav.fromScratch(2,sampleRate,'16',samples,{'container':'RIFF'});
    
    
    fs.writeFileSync('master.wav',new_wav.toBuffer());
})