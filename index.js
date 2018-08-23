var fs = require('fs');
var path = require('path');
var WavDecoder = require('wav-decoder');
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
// relative path to the .wav files
var rWavPath = path.join(__dirname,'masteringjavascriptnode','reference.wav')
var sWavPath = path.join(__dirname,'masteringjavascriptnode','master.wav')

var table = (rWavPath)=>{
    readFile(rWavPath).then((buffer)=>{
        return WavDecoder.decode(buffer);
    }).then (function(audioData){
        var bins = 1024
        var left = audioData.channelData[0];
        var right = audioData.channelData[1];
        var sampleRate = audioData.sampleRate;
        var truncatedLength = left.length%bins*bins;
        var mono = new Float32Array(truncatedLength);
        var side = new Float32Array(truncatedLength);

        for (var i =0; i<truncatedLength; i++){
            mono[i] = (left[i]+right[i])/2;
            side[i] = left[i]-mono;
        }
        var iterations = truncatedLength/bins;

        function savedFFTRow(){
            this.mono = new Float32Array(bins);
            this.side = new Float32Array(bins);
            this.monoCos = new Float32Array(bins);
            this.monoSin = new Float32Array(bins);
            this.sideCos = new Float32Array(bins);
            this.sideSin = new Float32Array(bins);
            this.mono.fill(0);
            this.side.fill(0);
            this.monoCos.fill(0);
            this.monoSin.fill(0);
            this.sideSin.fill(0);
            this.sideCos.fill(0);
        };
        
        function row(){
            this.monoMean = 0;
            this.monoSD = 0;
            this.sideMean = 0;
            this.sideSD = 0;
            this.savedFFT = new Array(iterations);
        }
        var t = new Array(bins)
        for (var i =0; i<bins; i++){
            t[i]=new row;
            for (var j=0; j<iterations; j++){
                t[i].savedFFT[j]=new savedFFTRow;
            }
        }
        
        var reMono = new Float32Array(bins);
        var imMono = new Float32Array(bins);
        var reSide = new Float32Array(bins);
        var imSide = new Float32Array(bins);
        var reMonoCos = new Float32Array(bins);
        var imMonoOne = new Float32Array(bins);
        var reMonoSin = new Float32Array(bins);
        var imMonoTwo = new Float32Array(bins);
        var reSideCos = new Float32Array(bins);
        var imSideOne = new Float32Array(bins);
        var reSideSin = new Float32Array(bins);
        var imSideTwo = new Float32Array(bins);
        imMono.fill(0);
        imSide.fill(0);
        imMonoOne.fill(0);
        imMonoTwo.fill(0);
        imSideOne.fill(0);
        imSideTwo.fill(0);

        FFT.init(bins);
        
        // collecting mean value for middle and side
        for (var i = 0; i<iterations; i++){
            
            for (var j = 0; j<bins; j++){
                reMono=mono[bins*i+j];
                reSide=side[bins*i+j];
                reMonoCos[j]=Math.cos(j*Math.PI()/2)*mono[bins*i+j];
                reMonoSin[j]=Math.sin(j*Math.PI()/2)*mono[bins*i+j];
                reSideCos[j]=Math.cos(j*Math.PI()/2)*side[bins*i+j];
                reSideSin[j]=Math.sin(j*Math.PI()/2)*side[bins*i+j];
                
            }
            FFT.fft(reMono,imMono);
            FFT.fft(reSide,imSide);
            FFT.fft(reMonoCos,imMonoOne);
            FFT.fft(reMonoSin,imMonoTwo);
            FFT.fft(reSideCos,imSideOne);
            FFT.fft(reSideSin,imSideTwo);
            //accumulate mean per bin per iterations and get over all mean in the end
            for (var k = 0; k<bins; k++){
                t.savedFFT[i].mono[k]=reMono[k];
                t.savedFFT[i].side[k]=reSide[k];
                t.savedFFT[i].monoCos[k]=reMonoCos[k]
                t.savedFFT[i].monoSin[k]=reMonoSin[k]
                t.savedFFT[i].sideCos[k]=reSideCos[k]
                t.savedFFT[i].sideSin[k]=reSideSin[k]
                t[k].monoMean+=reMono[k]/iterations
                t[k].sideMean+=reSide[k]/iterations
            }
        }
        // collecting standard deviation value for middle and side
        for (var i = 0; i<iterations; i++){
            for (var j = 0; j<bins; j++){
                t[i].monoSD+=Math.abs(t[i].monoMean-t[i].savedFFT[i].mono[j]/iterations)
                t[i].sideSD+=Math.abs(t[i].sideMean-t[i].savedFFT[i].side[j]/iterations)
            }
        }

        return t
    })
}





readFile(sWavPath).then((buffer)=>{
    return WavDecoder.decode(buffer);
}).then (function(audioData){
    //console.log(audioData.channelData[0]);// returns float 32 array
    
    //the following number needs to adjust according to the length of the array or we need to change the length of the original array
    var bins=1024;
    
    var left= audioData.channelData[0];
    var right= audioData.channelData[1];
    
    
    FFT.init(bins);
    var originalLength =left.length;
    //var iterations = (originalLength/bins)*2-1;
    var iterations = (originalLength/bins);
    var originalSR=audioData.sampleRate;
    var remainderAdded = originalLength%bins+originalLength;
    var mono = new Float32Array(remainderAdded);
    var leftOnly = new Float32Array(remainderAdded);
    var rightOnly = new Float32Array(remainderAdded);
    var reLeftOne = new Float32Array(bins);
    var reLeftTwo = new Float32Array(bins);
    var imLeftOne = new Float32Array(bins);
    var imLeftTwo = new Float32Array(bins);
    var reRight = new Float32Array(bins);
    var imRight = new Float32Array(bins);
    var outLeft = new Float32Array(originalLength);
    var outRight = new Float32Array(originalLength);
    var ampRatio = new Float32Array(remainerAdded);
    mono.fill(0);
    leftOnly.fill(0);
    rightOnly.fill(0);
    imLeftOne.fill(0);
    imLeftTwo.fill(0);
    imRightOne.fill(0);
    imRightTwo.fill(0);
    reLeftOne.fill(0);
    reRightOne.fill(0);
    reLeftTwo.fill(0);
    reRightTwo.fill(0);
    outLeft.fill(0);
    outRight.fill(0);
    /*
    for (var i = 0; i<originalLength; i++){
        reLeft[i]=left[i]
        reRight[i]=right[i]
    }
    */
    for (var i = 0; i<iterations; i++){
        for (var j = 0; j<bins/2; j++){
            /*
            if (i%2===0){
                ///window functioning first half of a bin
                reLeftOne[j]=Math.cos(j*Math.PI()/2)*reLeft[bins*i+j]
            }
            else{
                ///window functioning second half of a bin
                reLeftTwo[j]=Math.sin(j*Math.PI()/2)*reLeft[bins*i+j]
            }
            */
            //windowing function applied to the samples
            reLeftOne[j]=Math.cos(j*Math.PI()/2)*left[bins*i+j]
            reLeftTwo[j]=Math.sin(j*Math.PI()/2)*left[bins*i+j]
            FFT.fft(reLeftOne,imLeftOne);
            FFT.fft(reLeftTwo,imLeftTwo);


        }
        //TODO : do something to the FFT
        // reminder1: phase=Math.atan2(r/i)
        // reminder2: amplitude = Math.sqrt(r*r+i*i)
        // reminder3: newR=oldR*amplitudeRatio && newI=oldI*amplitudeRatio
        for (var k=0; k<bins; k++){
            reLeftOne[k]*=ampRatio[k];
            reLeftTwo[k]*=ampRatio[k];
            imLeftOne[k]*=ampRatio[k];
            imLeftTwo[k]*=ampRatio[k];
        }
        FFT.ifft(reLeftOne,imLeftOne);
        FFT.ifft(reLeftTwo,imLeftTwo);
        for (var l = 0; l<bins/2; l++){

            outLeft[bins*i+l]+=reLeftOne[l]+reLeftTwo[l]

        }

    }
    //console.log(reLeft);
    //console.log(reRight);
    

    //do something with the re and im array
    
    //console.log(reLeft);
    //console.log(reRight);
    /*
    for (var i = 0; i<originalLength; i++){
        //default format needed for AudioData is {float:false,bitDepth:16}
        //outLeft[i]=Math.trunc((reLeft[i]/2.0+0.5)*65535.00)
        //outRight[i]=Math.trunc((reRight[i]/2.0+0.5)*65535.00)
        outLeft[i]=(reLeft[i]);
        outRight[i]=(reRight[i]);
     }
     */  
    
    var mastered ={
        float:true,
        symmetric:true,
        bitDepth:32,
        sampleRate:originalSR,
        channelData:[
            outLeft,
            outRight
        ]
    } 
    
    WavEncoder.encode(mastered).then((buffer)=>{
        fs.writeFileSync('mastered.wav',new Buffer(buffer));
    });
})

var referenceTable=table(rWavPath);
