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
        var iterations = truncatedLength/bins;

        function bin(){
            this.mono= 0;
            this.side = 0;

            this.monoFFTReal = 0;
            this.sideFFTReal = 0;

            this.monoFFTImag = 0;
            this.sideFFTImag = 0;

            this.monoFFTAmp = 0;
            this.sideFFTAmp = 0;

        };
        
        function iteration(){
            this.monoMean = 0;
            this.monoSD = 0;
            this.sideMean = 0;
            this.sideSD = 0;
            this.bi = new Array(bins);
            
        }
        function t(){
            this.it= new Array(iterations)
            this.monoMean = 0;
            this.sideMean = 0;
            this.monoFFTMean = new Float32Array(bins);
            this.sideFFTMean = new Float32Array(bins);
            this.monoFFTSD = new Float32Array(bins);
            this.sideFFTSD = new Float32Array(bins);
            for (var i =0; i<iteration; i++){
                t.it[i]=new iteration;
                for (var j=0; j<bins; j++){
                    t.it[i].bi[j]=new bin;
                }
            }
        }
        
        var reMono = new Float32Array(bins);
        var imMono = new Float32Array(bins);
        var reSide = new Float32Array(bins);
        var imSide = new Float32Array(bins);

        imMono.fill(0);
        imSide.fill(0);

        FFT.init(bins);
        // transform left/right to mono/side
        for (var i =0; i<truncatedLength; i++){
            mono[i] = (left[i]+right[i])/2;
            side[i] = left[i]-mono;
        }
        // collecting FFT means for mono and side per bin
        for (var i = 0; i<iterations; i++){
            for (var j = 0; j<bins; j++){
                reMono=mono[bins*i+j];
                reSide=side[bins*i+j];
                t.it[i].bin[j].mono=mono[bins*i+j];
                t.it[i].bin[j].side=side[bins*i+j];
            }
            FFT.fft(reMono,imMono);
            FFT.fft(reSide,imSide);

            //accumulate mean per bin per iterations and get over all mean in the end
            for (var k = 0; k<bins; k++){
                
                t.it[i].bin[k].monoFFTReal=reMono[k];
                t.it[i].bin[k].sideFFTReal=reSide[k];
                
                t.it[i].bin[k].monoFFTImag=imMono[k];
                t.it[i].bin[k].sideFFTImag=imSide[k];

                t.it[i].bin[k].monoFFTAmp = Math.sqrt(Math.pow(reMono[k],2)+Math.pow(imMono[k],2))
                t.it[i].bin[k].sideFFTAmp = Math.sqrt(Math.pow(reSide[k],2)+Math.pow(imSide[k],2))

                t.monoFFTMean[k]+=t.it[i].bin[k].monoFFTAmp/iterations
                t.sideFFTMean[k]+=t.it[i].bin[k].sideFFTAmp/iterations
            }
        }
        // collecting standard deviation value for middle and side
        for (var i = 0; i<iterations; i++){
            for (var j = 0; j<bins; j++){
                t.monoFFTSD[j]+=Math.abs(t.it[i].monoFFTMean[j]-t.it[i].bin[j].monoFFTAmp)/iterations
                t.sideFFTSD[j]+=Math.abs(t.it[i].sideFFTMean[j]-t.it[i].bin[j].sideFFTAmp)/iterations
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
