var fs = require('fs');
var path = require('path');
var WavDecoder = require('wav-decoder');
//var WaveFile = require('wavefile');
//var ooura = require('ooura');
//var FFT = require ('fft');
//var FFT = require('fft.js');
var lib = require('ml-fft');
var WavEncoder = require('wav-encoder');
var FFT = lib.FFT;
var FFTUtils = lib.FFTUtils;
var readFile = (filepath)=>{
    return new Promise((resolve, reject)=>{
        fs.readFile(filepath,(err,buffer)=>{
            if(err){
                return reject(err);
            }
            return resolve(buffer);
        })
    })
}
// relative path to the .wav file
var wavPath = path.join(__dirname,'masteringjavascriptnode','master.wav')




readFile(wavPath).then((buffer)=>{
    return WavDecoder.decode(buffer);
}).then (function(audioData){
    //console.log(audioData.channelData[0]);// returns float 32 array
    
    //the following number needs to adjust according to the length of the array or we need to change the length of the original array
    var bins=4;
    /*
    var f =new FFT(bins);
    
    var compLeft=f.toComplexArray(left);
    var fftLeft = f.createComplexArray();
    var ifftLeft = f.createComplexArray();
    f.transform(fftLeft,compLeft);
    */
   var left= audioData.channelData[0];
   var right= audioData.channelData[1];
   FFT.init(bins);
   var reLeft = new Float32Array(bins);
   var imLeft = new Float32Array(bins);
   var reRight = new Float32Array(bins);
   var imRight = new Float32Array(bins);
   var outLeft = new Float32Array(bins);
   var outRight = new Float32Array(bins);

   for (var i = 0; i<left.length; i++){
       reLeft[i]=left[i]
       reRight[i]=right[i]
    }
    imLeft.fill(0);
    imRight.fill(0);
    //console.log(reLeft);
    //console.log(reRight);
    FFT.fft(reLeft,imLeft);
    FFT.fft(reRight,imRight)

    //do something with the re and im array
    FFT.ifft(reLeft,imLeft);
    FFT.ifft(reRight,imRight)
    //console.log(reLeft);
    //console.log(reRight);
    for (var i = 0; i<left.length; i++){
        outLeft[i]=Math.trunc((reLeft[i]/2.0+0.5)*65535.00)
        outRight[i]=Math.trunc((reRight[i]/2.0+0.5)*65535.00)
     }  
    
    var mastered ={
        sampleRate:44100,
        channelData:[
            outLeft,
            outRight
        ]
    } 
    //var new_wav=new WaveFile();
    // the following needs to be changed
    //console.log(outLeft)
    //new_wav.fromScratch(2,audioData.sampleRate,'16',[outLeft,outRight]);
    
    //var outputFileStream = new FileWriter('./master.wav')
    //fs.writeFileSync('master.wav',new_wav.toBuffer());
    WavEncoder.encode(mastered).then((buffer)=>{
        fs.writeFileSync('mastered.wav',new Buffer(buffer));
    });
})
