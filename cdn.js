var reader=new FileReader;
var progress = document.querySelector('.percent');
//window.AudioContext = window.AudioContext || window.webkitAudioContext;
//var context = new AudioContext();
//var context = window.AudioContext || window.webkitAudioContext;
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
        coi=Math.floor(i/ratio);
        ys[i]=result[0][coi]+result[1][coi]*(xs[i]-coi)+result[2][coi]*(xs[i]-coi)**2+result[3][coi]*(xs[i]-coi)**3
    }
    return ys;
}
//returns a new array with a given sample rate
function SRConverter(origArray,origSR,newSR){
    var ratio = newSR/origSR;
    var origLength = origArray.length;
    var x = new Float32Array(origArray.length);
    for (var i =0; i<origLength; i++){
        x[i]=i;
    }
    var y = origArray;
    var newArray = cubicSpline(x,y,ratio);
    return newArray;
}
/*
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

*/
/*
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
*/
function abortRead() {
    reader.abort();
}

function errorHandler(evt) {
    switch(evt.target.error.code) {
    case evt.target.error.NOT_FOUND_ERR:
        alert('File Not Found!');
        break;
    case evt.target.error.NOT_READABLE_ERR:
        alert('File is not readable');
        break;
    case evt.target.error.ABORT_ERR:
        break; // noop
    default:
        alert('An error occurred reading this file.');
    };
}

function updateProgress(evt) {
    // evt is an ProgressEvent.
    if (evt.lengthComputable) {
    var percentLoaded = Math.round((evt.loaded / evt.total) * 100);
    // Increase the progress bar length.
    if (percentLoaded < 100) {
        progress.style.width = percentLoaded + '%';
        progress.textContent = percentLoaded + '%';
    }
    }
}

function handleFileSelect(evt) {
    // Reset progress indicator on new file selection.
    progress.style.width = '0%';
    progress.textContent = '0%';

    reader = new FileReader();
    reader.readAsArrayBuffer(evt.target.files[0]);
    reader.onerror = errorHandler;
    reader.onprogress = updateProgress;
    reader.onabort = function(e) {
    alert('File read cancelled');
    };
    reader.onloadstart = function(e) {
    document.getElementById('progress_bar').className = 'loading';
    };
    reader.onload = function(e) {
    // Ensure that the progress bar displays 100% at the end.
    progress.style.width = '100%';
    progress.textContent = '100%';
    setTimeout("document.getElementById('progress_bar').className='';", 2000);
    var arrayBuffer = this.result;
    var byteOffset= 0;
    var bufferlength=0;
    var sound=null;
    //var floatBuffer = new Float32Array(arrayBuffer,byteOffset,bufferlength)
    //var floatBuffer = new Float32Array(arrayBuffer)

    var intBuffer= new Int32Array(arrayBuffer)
    var bitwise = new Array
    var stringwise = new Array
    for (var i = 0; i<intBuffer.length; i++){
        bitwise.push(intBuffer[i]&0x0000ffff);
        bitwise.push((intBuffer[i]&0xffff0000)>>16);
        stringwise.push((intBuffer[i]&0x0000ffff).toString(16));
        stringwise.push(((intBuffer[i]&0xffff0000)>>16).toString(16));
    }
    console.log(intBuffer)
    console.log(bitwise)
    console.log(stringwise)
    
    
    var bufferSampleRate=intBuffer[6];
    var channels=(arrayBuffer[6]&0xffff0000)>>16; 
    var bitrate = intBuffer[7]/bufferSampleRate/channels*8
    /*
    var bitdepth = null;
    if (bitrate ==8){
        bitdepth =1;
    }
    else if(bitrate ==16){
        bitdepth=2;
    }
    else if(bitrate ==32){
        bitdepth=4;
    }
    */
    var max_number = 2**(bitrate-1);
    var subchunk = intBuffer[5];
    var bitdepth = bitrate/8;
    var sampleLength=(intBuffer[1]-36)/bitdepth/channels;
    var bufferLeft =new Array;
    var bufferRight=new Array;
    if(bitrate==16 && channels==2){
        for (var i=0; i<Math.ceil(sampleLength/2); i++){
            bufferLeft.push(intBuffer[11+i]&0x0000ffff/max_number)
            bufferRight.push(intBuffer[11+i]&0xffff0000/max_number)
        }
    }
    else if (bitrate==16 && channels ==1){
        for (var i=0; i<Math.ceil(sampleLength/2); i++){
            bufferLeft.push(intBuffer[11+i]&0x0000ffff/max_number)
            bufferLeft.push(intBuffer[11+i]&0xffff0000/max_number)
            bufferRight.push(intBuffer[11+i]&0x0000ffff/max_number)
            bufferRight.push(intBuffer[11+i]&0xffff0000/max_number)
        }
    }
    if(bitrate==32 && channels==2){
        for (var i=0; i<sampleLength; i++){
            bufferLeft.push(intBuffer[11+i]&0x0000ffff/max_number)
            bufferRight.push(intBuffer[11+i]&0xffff0000/max_number)
        }
    }
    else if (bitrate==32 && channels ==1){
        for (var i=0; i<sampleLength; i++){
            bufferLeft.push(intBuffer[11+i]&0x0000ffff/max_number)
            bufferLeft.push(intBuffer[11+i]&0xffff0000/max_number)
            bufferRight.push(intBuffer[11+i]&0x0000ffff/max_number)
            bufferRight.push(intBuffer[11+i]&0xffff0000/max_number)
        }
    }
    //console.log(bufferSampleRate)
    /*
    contex.decodeAudioData(arrayBuffer,(
        function(buffer){
            sound=buffer;
        },onError));
    console.log(sound)
    }

    bit[bitdepth] = [null,8,16,null,32]
    36+bitdepth*channels*numberofsamples

    40 (8bit mono 4 samp)
    44 (8bin mono 8 samp) 44100->44100
    44 (8bit stereo 4 samp)
    52 (8bit stereo 8 samp) 44100->88200
    44 (16bit mono 4 samp)
    52 (16bit mono 8 samp) 44100->88200
    52 (16bit stereo 4 samp)
    68 (16bit stereo 8 samp) 44100->176400
    52 (32bit mono 4 samp)
    68 (32bit stereo 4 samp)

    */

    }
}