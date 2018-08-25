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

function cubicSpline(x,y,ratio){
    //x is an index array of length y
    //y is the original array
    // ratio is defined by newsamplerate/origsamperate
    var n=x.length-1;
    var h = new Float32Array(n);
    var newLength = y.length*ratio;
    for (var i=0; i<n; i++){
        h[i]=x[i+1]-x[i];
    }
    var al = new Float32Array(n-1);
    for (var i=1; i<n; i++){
        al[i]=3*((y[i+1]-y[i])/h[i] - (y[i]-y[i-1])/h[i-1]);
    }
    al[0]=0;
    var l = new Float32Array(n+1);
    var u = new Float32Array(n+1);
    var z = new Float32Array(n+1);
    l.fill(1);
    u.fill(0);
    z.fill(0);
    for (var i=1; i<n; i++){
        l[i] = 2*(x[i+1]-x[i-1]) - h[i-1]*u[i-1];
        u[i] = h[i]/l[i];
        z[i] = (al[i] - h[i-1]*z[i-1])/l[i];
    }
    var b = new Float32Array(n+1);
    var c = new Float32Array(n+1);
    var d = new Float32Array(n+1);
    l.fill(0);
    u.fill(0);
    z.fill(0);
    for (var i = n-1; i>=0; i--){
        c[i] = z[i] - u[i]*c[i+1]
        b[i] = (y[i+1]-y[i])/h[i] - h[i]*(c[i+1] + 2*c[i])/3
        d[i] = (c[i+1]-c[i])/(3*h[i])
    }
    var result = [y, b, c, d];
    var xs = new Float32Array(newLength);
    var ys = new Float32Array(newLength);
    var coi;
    for(var i =0; i<newLength; i++){
        xs[i]=i/ratio;
        //corresponding orig index 
        coi=Math.floor(i/ratio);
        ys[i]=result[0][coi]+result[1][coi]*(xs[i]-coi)+result[2][coi]*(xs[i]-coi)**2+result[3][coi]*(xs[i]-coi)**3
    }
    return ys;
}
//returns a new array with a given sample rate
function SRConverter(origArray,origSR,newSR){
    //spline function
    var ratio = newSR/origSR;
    //var interval = origSR/newSR;
    var origLength = origArray.length;
    var x = new Float32Array(origArray.length);
    for (var i =0; i<origLength; i++){
        x[i]=i;
    }
    var y = origArray;
    var newArray = cubicSpline(x,y,ratio);
    return newArray;
}

function table(rWavPath){
    readFile(rWavPath).then((buffer)=>{
        return WavDecoder.decode(buffer);
    }).then (function(audioData){
        var bins = 1024
        var sampleRate = 44100;
        if (audioData.sampleRate==44100){
            var left = audioData.channelData[0];
            var right = audioData.channelData[1];
        }
        else{
            var left = SRConverter(audioData.channelData[0],sampleRate,44100);
            var right = SRConverter(audioData.channelData[1],sampleRate,44100);
        }
        var origLength = left.length;
        var newLength = Math.floor(origLength/bins)+(bins)*2;
        var mono = new Float32Array(newLength);
        var side = new Float32Array(newLength);
        mono.fill(0);
        side.fill(0);
        var iterations = (newLength/bins)*2-1;

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
            this.origLength= origLength;
            this.length = newLength;
            this.sampleRate = sampleRate;
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
        // transform left/right to mono/side with zero padding
        for (var i =0; i<origLength; i++){
            mono[i+bins/2] = (left[i]+right[i])/2;
            side[i+bins/2] = left[i]-mono;
        }
        // collecting FFT means for mono and side per bin
        for (var i = 0; i<iterations; i++){
            for (var j = 0; j<bins; j++){
                reMono=mono[bins/2*i+j]*Math.sin(j/(bins-1)*Math.PI);
                reSide=side[bins/2*i+j]*Math.sin(j/(bins-1)*Math.PI);
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


function reconstruct(signalTable,referenceTable,desiredSampleRate){
    var bins=1024;
    var newLength=signalTable.newLength;
    
    function ratio(bins){
        this.mono=new Float32Array(bins)
        this.side=new Float32Array(bins)
    }

    var ratio = new ratio(bins);
    
    for (var i =0; i<bins; i++){
        ratio.mono[i]=referenceTable.monoFFTMean[i]/signalTable.monoFFTMean[i];
        ratio.side[i]=referenceTable.sideFFTMean[i]/signalTable.sideFFTMean[i];
    }
    function soundData(){
        this.left = Float32Array(signalTable.origLength);
        this.right = Float32Array(signalTable.origLength);
        this.left.fill(0);
        this.right.fill(0);
    }

    var data= new soundData;

    var iterations = signalTable.it.length;

    var monoSliverReal = new Float32Array(bins);
    var monoSliverImag = new Float32Array(bins);
    var monoSliverReal = new Float32Array(bins);
    var monoSliverImag = new Float32Array(bins);
    var left = new Float32Array(signalTable.newLength);
    var right = new Float32Array(signalTable.newLength);
    left.fill(0);
    right.fill(0);

    for (var i =0; i<iterations; i++){
        for(var j = 0; j<bins; j++){
            monoSliverReal[j]=siginalTable.it[i].bin[j].monoFFTReal*ratio.mono[j];
            monoSliverImag[j]=siginalTable.it[i].bin[j].monoFFTImag*ratio.mono[j];
            sideSliverReal[j]=siginalTable.it[i].bin[j].sideFFTReal*ratio.side[j];
            sideSliverImag[j]=siginalTable.it[i].bin[j].sideFFTImag*ratio.side[j];
        }
        FFT.ifft(monoSliverReal,monoSliverImag);
        FFT.ifft(sideSliverReal,sideSliverImag);
        for(var j = 0; j<bins; j++){
            left[i*bins/2+k]+=monoSliverReal[k]+sideSliverRea[k];
            right[i*bins/2+k]+=monoSliverReal[k]-sideSliverRea[k];
        }
    }

    for (var i = 0; i<origLength; i++){
        data.left[i]= left[bins/2+i];
        data.right[i]= right[bins/2+i];
    }
    var newLeft = SRConverter(data.left,44100,desiredSampleRate);
    var newRight = SRConverter(data.right,44100,desiredSampleRate);
    var mastered ={
        float:true,
        symmetric:true,
        bitDepth:32,
        sampleRate:44100,
        channelData:[
            newLeft,
            newRight
        ]
    } 
    
    WavEncoder.encode(mastered).then((buffer)=>{
        fs.writeFileSync('mastered.wav',new Buffer(buffer));
    });

}


/*
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
    
    for (var i = 0; i<originalLength; i++){
        reLeft[i]=left[i]
        reRight[i]=right[i]
    }
    
    for (var i = 0; i<iterations; i++){
        for (var j = 0; j<bins/2; j++){
            
            if (i%2===0){
                ///window functioning first half of a bin
                reLeftOne[j]=Math.cos(j*Math.PI()/2)*reLeft[bins*i+j]
            }
            else{
                ///window functioning second half of a bin
                reLeftTwo[j]=Math.sin(j*Math.PI()/2)*reLeft[bins*i+j]
            }
            
            //windowing function applied to the samples
            reLeftOne[j]=Math.cos(j*Math.PI()/2)*left[bins*i+j]
            reLeftTwo[j]=Math.sin(j*Math.PI()/2)*left[bins*i+j]
            FFT.fft(reLeftOne,imLeftOne);
            FFT.fft(reLeftTwo,imLeftTwo);


        }
        //TODO : do something to the FFT
        // reminder1: phase=Math.atan2(r/i)
        // reminder2: amplitude = Math.sqrt(r*r+i*i)
        // reminder3: newR=origR*amplitudeRatio && newI=origI*amplitudeRatio
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
    
    for (var i = 0; i<originalLength; i++){
        //default format needed for AudioData is {float:false,bitDepth:16}
        //outLeft[i]=Math.trunc((reLeft[i]/2.0+0.5)*65535.00)
        //outRight[i]=Math.trunc((reRight[i]/2.0+0.5)*65535.00)
        outLeft[i]=(reLeft[i]);
        outRight[i]=(reRight[i]);
     }
     
    
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
*/
