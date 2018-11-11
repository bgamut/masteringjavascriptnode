var reader=new FileReader;
var WaveFile = window.WaveFile;
var progress = document.querySelector('.percent');
//window.AudioContext = window.AudioContext || window.webkitAudioContext;
//var context = new AudioContext();
//var context = window.AudioContext || window.webkitAudioContext;
var referenceBufferLeft = new Array;
var referenceBufferRight = new Array;
var referenceBufferMono = new Array;
var referenceBufferLeftOnly = new Array;
var referenceBufferRightOnly = new Array;
var referenceBufferSampleRate =0;
var referenceOnline = false;
var referenceTable;
var mainBufferLeft = new Array;
var mainBufferRight = new Array;
var mainBufferMono = new Array;
var mainBufferLeftOnly = new Array;
var mainBufferRightOnly = new Array;
var mainBufferSampleRate =0;
var mainOnline = false;
var mainTable;
var targetaddress = "";
var mastered;

var referenceFileSelect = function(evt){
    return new Promise(function (resolve, reject){
    // Reset progress indicator on new file selection.
    //progress.style.width = '0%';
    //progress.textContent = '0%';
    console.log('reference file read started');
    reader = new FileReader();
    reader.readAsArrayBuffer(evt.target.files[0]);
    reader.onerror = errorHandler;
    //reader.onprogress = updateProgress;
    reader.onabort = function(e) {
        alert('File read cancelled');
    };

    reader.onload = function(e) {
    var arrayBuffer = this.result;
    /*
    var wav = new WaveFile(arrayBuffer);
    wav.toBitDepth("32");
    arrayBuffer = wav.toBuffer();
    */
    var byteOffset= 0;
    var bufferlength=0;
    var sound=null;
    var intBuffer= new Int32Array(arrayBuffer);
    var bitwise = new Array;
    var stringwise = new Array;
    for (var i = 0; i<intBuffer.length; i++){
        bitwise.push(intBuffer[i]&0x0000ffff);
        bitwise.push((intBuffer[i]&0xffff0000)>>16);
        stringwise.push((intBuffer[i]&0x0000ffff).toString(16));
        stringwise.push(((intBuffer[i]&0xffff0000)>>16).toString(16));
    };
    console.log("file read is done ");
    referenceBufferSampleRate=intBuffer[6];
    var channels=bitwise[11];
    var bitrate = intBuffer[7]/referenceBufferSampleRate/channels*8;
    var max_number = 2**(bitrate-1);
    var subchunk = intBuffer[5];
    var bitdepth = bitrate/8;
    var sampleLength=(intBuffer[1]-36)/bitdepth/channels;

    console.log("bitrate : "+ bitrate)

    if(bitrate==16 && channels==2){
        console.log("bitrate is "+bitrate);
        for (var i=0; i<Math.ceil(sampleLength/2); i++){
            referenceBufferLeft.push(intBuffer[11+i]&0x0000ffff/max_number);
            referenceBufferRight.push(intBuffer[11+i]&0xffff0000/max_number);
        };
    }
    else if (bitrate==16 && channels ==1){
        console.log('bitrate is '+bitrate);
        for (var i=0; i<Math.ceil(sampleLength/2); i++){
            referenceBufferLeft.push(intBuffer[11+i]&0x0000ffff/max_number);
            referenceBufferLeft.push(intBuffer[11+i]&0xffff0000/max_number);
            referenceBufferRight.push(intBuffer[11+i]&0x0000ffff/max_number);
            referenceBufferRight.push(intBuffer[11+i]&0xffff0000/max_number);
        };
    };
    if(bitrate==24 && channels==1){
        for (var i=0; i<sampleLength; i++){
            if(i%2==0){
                referenceBufferLeft.push(intBuffer[11+i]&0x0000ffff/max_number);
                referenceBufferLeft.push(intBuffer[11+i]&0xffff0000/max_number);
            }
            

        };
    }
    else if (bitrate==24 && channels ==2){
        for (var i=0; i<sampleLength; i++){
            referenceBufferLeft.push(intBuffer[11+i]&0x0000ffff/max_number);
            referenceBufferLeft.push(intBuffer[11+i]&0xffff0000/max_number);
            referenceBufferRight.push(intBuffer[11+i]&0x0000ffff/max_number);
            referenceBufferRight.push(intBuffer[11+i]&0xffff0000/max_number);
        };
    };
    if(bitrate==32 && channels==2){
        for (var i=0; i<sampleLength; i++){
            referenceBufferLeft.push(intBuffer[11+i]&0x0000ffff/max_number);
            referenceBufferRight.push(intBuffer[11+i]&0xffff0000/max_number);
        };
    }
    else if (bitrate==32 && channels ==1){
        for (var i=0; i<sampleLength; i++){
            referenceBufferLeft.push(intBuffer[11+i]&0x0000ffff/max_number);
            referenceBufferLeft.push(intBuffer[11+i]&0xffff0000/max_number);
            referenceBufferRight.push(intBuffer[11+i]&0x0000ffff/max_number);
            referenceBufferRight.push(intBuffer[11+i]&0xffff0000/max_number);
        };
    };
    for (var i=0; i<referenceBufferLeft.length; i++){
        referenceBufferLeft[i]=(referenceBufferLeft[i]-0.5)*2.0;
        referenceBufferRight[i]=(referenceBufferRight[i]-0.5)*2.0;
        referenceBufferMono[i]=(referenceBufferLeft[i]/2.0+referenceBufferRight[i]/2.0);
        referenceBufferLeftOnly[i]=referenceBufferLeft[i]-referenceBufferMono[i];
        referenceBufferRightOnly[i]=referenceBufferRight[i]-referenceBufferMono[i];
    };
    
    
    
}
    referenceOnline=true;
    console.log(referenceOnline);
    resolve('done');
    reject('rejected');
})
};

var handleReferenceFileSelect=function(evt){
    console.log("something is happening");
    referenceFileSelect(evt).then(function(val){
        console.log(mainOnline);
    });
};

function validateEmail(mail){
    if (/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(mail)){
        return (true)
    }
    else{
        return(false)
    }
}
function setTargetAddress(){
    var tempaddress = document.getElementById("targetemail").value;
    if (validateEmail(mail) == true){
        targetaddress = tempaddress
    }
    else{
        targetaddress = ""
    }
};

function cubicSpline(x,y,ratio){
    //x is an index array of length y
    //y is the original array
    // ratio is defined by newsamplerate/origsamperate
    var n=x.length-1;
    var h = new Float32Array(n);
    var newLength = y.length*ratio;
    for (var i=0; i<n; i++){
        h[i]=x[i+1]-x[i];
    };
    var al = new Float32Array(n-1);
    for (var i=1; i<n; i++){
        al[i]=3*((y[i+1]-y[i])/h[i] - (y[i]-y[i-1])/h[i-1]);
    };
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
    };
    var b = new Float32Array(n+1);
    var c = new Float32Array(n+1);
    var d = new Float32Array(n+1);
    l.fill(0);
    u.fill(0);
    z.fill(0);
    for (var i = n-1; i>=0; i--){
        c[i] = z[i] - u[i]*c[i+1];
        b[i] = (y[i+1]-y[i])/h[i] - h[i]*(c[i+1] + 2*c[i])/3;
        d[i] = (c[i+1]-c[i])/(3*h[i]);
    };
    var result = [y, b, c, d];
    var xs = new Float32Array(newLength);
    var ys = new Float32Array(newLength);
    var coi;
    for(var i =0; i<newLength; i++){
        xs[i]=i/ratio;
        coi=Math.floor(i/ratio);
        ys[i]=result[0][coi]+result[1][coi]*(xs[i]-coi)+result[2][coi]*(xs[i]-coi)**2+result[3][coi]*(xs[i]-coi)**3;
    };
    return ys;
};
//returns a new array with a given sample rate
function SRConverter(origArray,origSR,newSR){
    var ratio = newSR/origSR;
    var origLength = origArray.length;
    var x = new Float32Array(origArray.length);
    for (var i =0; i<origLength; i++){
        x[i]=i;
    };
    var y = origArray;
    var newArray = cubicSpline(x,y,ratio);
    return newArray;
};

function abortRead() {
    reader.abort();
};

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
};

function updateProgress(evt) {
    // evt is an ProgressEvent.
    if (evt.lengthComputable) {
        var percentLoaded = Math.round((evt.loaded / evt.total) * 100);
        // Increase the progress bar length.
        if (percentLoaded < 100) {
            progress.style.width = percentLoaded + '%';
            progress.textContent = percentLoaded + '%';
        };
    };
};

var tabulation=function(){
mainTable = table(mainBufferLeft, mainBufferRight, mainBufferSampleRate);
referenceTable = table(referenceBufferLeft, referenceBufferRight, referenceBufferSampleRate);
}
var finalFrontier = new Promise(function(resolve,reject){ 
    console.log("started button function")
    resolve('done');
    reject('rejected')
})
var readButtonPressed = function(){
finalFrontier.then(function(val){ 
    tabulation()
    console.log('initiating json data sending')
    var JSONdata = reconstruct(mainTable,referenceTable,44100);
    if(document.getElementById('targetemail')!==""){
        setTargetAddress();
        send_data_to_server(JSONdata,targetaddress);
    }
    else{
        alert('Please Enter Your Email Address')
    }
    var wav = new WaveFile();
    wav.fromScratch(2,44100,'32',[JSONdata.left,JSONdata.right])
    fs.writeFileSync('electron.wav',wav.toBuffer())
    resolve('done');
    reject('rejected')
})}





var mainFileSelect = function(evt){
    return new Promise(function (resolve, reject){
    // Reset progress indicator on new file selection.

    reader = new FileReader();
    reader.readAsArrayBuffer(evt.target.files[0]);
    reader.onerror = errorHandler;
    //reader.onprogress = updateProgress;
    reader.onabort = function(e) {
    alert('File read cancelled');
    };

    reader.onload = function(e) {

    var arrayBuffer = this.result;
    /*
    wav.toBitDepth("32");
    arrayBuffer = wav.toBuffer();
    */
    var byteOffset= 0;
    var bufferlength=0;
    var sound=null;
    //var floatBuffer = new Float32Array(arrayBuffer,byteOffset,bufferlength)
    //var floatBuffer = new Float32Array(arrayBuffer)

    var intBuffer= new Int32Array(arrayBuffer);
    var bitwise = new Array;
    var stringwise = new Array;
    for (var i = 0; i<intBuffer.length; i++){
        bitwise.push(intBuffer[i]&0x0000ffff);
        bitwise.push((intBuffer[i]&0xffff0000)>>16);
        stringwise.push((intBuffer[i]&0x0000ffff).toString(16));
        stringwise.push(((intBuffer[i]&0xffff0000)>>16).toString(16));
    };
    console.log(intBuffer);
    /*
    console.log(bitwise)
    console.log(stringwise)
    */
    
    mainBufferSampleRate=intBuffer[6];
    var channels=bitwise[11];
    var bitrate = intBuffer[7]/mainBufferSampleRate/channels*8;
    var max_number = 2**(bitrate-1);
    var subchunk = intBuffer[5];
    var bitdepth = bitrate/8;
    var sampleLength=(intBuffer[1]-36)/bitdepth/channels;



    console.log('sr : '+mainBufferSampleRate);
    console.log('channels : '+channels);
    console.log('bitrate : ' +bitrate);
    console.log('sampleLength : ' +sampleLength);

    if(bitrate==16 && channels==2){
        for (var i=0; i<Math.ceil(sampleLength/2); i++){
            mainBufferLeft.push(intBuffer[11+i]&0x0000ffff/max_number);
            mainBufferRight.push(intBuffer[11+i]&0xffff0000/max_number);
        };
    }
    else if (bitrate==16 && channels ==1){
        for (var i=0; i<Math.ceil(sampleLength/2); i++){
            mainBufferLeft.push(intBuffer[11+i]&0x0000ffff/max_number);
            mainBufferLeft.push(intBuffer[11+i]&0xffff0000/max_number);
            mainBufferRight.push(intBuffer[11+i]&0x0000ffff/max_number);
            mainBufferRight.push(intBuffer[11+i]&0xffff0000/max_number);
        };
    };
    if(bitrate==32 && channels==2){
        for (var i=0; i<sampleLength; i++){
            mainBufferLeft.push(intBuffer[11+i]&0x0000ffff/max_number);
            mainBufferRight.push(intBuffer[11+i]&0xffff0000/max_number);
        };
    }
    else if (bitrate==32 && channels ==1){
        for (var i=0; i<sampleLength; i++){
            mainBufferLeft.push(intBuffer[11+i]&0x0000ffff/max_number);
            mainBufferLeft.push(intBuffer[11+i]&0xffff0000/max_number);
            mainBufferRight.push(intBuffer[11+i]&0x0000ffff/max_number);
            mainBufferRight.push(intBuffer[11+i]&0xffff0000/max_number);
        };
    };
    for (var i=0; i<mainBufferLeft.length; i++){
        mainBufferLeft[i]=(mainBufferLeft[i]-0.5)*2.0;
        mainBufferRight[i]=(mainBufferRight[i]-0.5)*2.0;
        mainBufferMono[i]=(mainBufferLeft[i]/2.0+mainBufferRight[i]/2.0);
        mainBufferLeftOnly[i]=mainBufferLeft[i]-mainBufferMono[i];
        mainBufferRightOnly[i]=mainBufferRight[i]-mainBufferMono[i];
    };
    //console.log(bufferLeft)
    //console.log(bufferRight)
    console.log(mainBufferMono);
    //console.log(bufferLeftOnly)
    //console.log(bufferRightOnly)
    
    mainOnline=true;
    };

})};

var handleMainFileSelect=function(evt){
console.log("something is happening");
mainFileSelect(evt).then(function(val){
    console.log(mainOnline);
    if(referenceOnline===true && mainOnline===true){
        console.log("and and")
    };
});
};
var barkscale = [0,51,127,200,270,370,440,530,640,770,950,1200,1550,19500];
/*
var bins = 1024;
*/
var bins = barkscale.length;   
function table(left, right, originalSampleRate){
    var sampleRate = 44100;
    console.log("in the table function")
    if (originalSampleRate==44100){
        var left = left;
        var right = right;
    }
    else{
        var left = SRConverter(left,originalSampleRate,44100);
        var right = SRConverter(right,originalSampleRate,44100);
    };
    var origLength = left.length;
    var mono = new Float32Array(origLength);
    var side = new Float32Array(origLength);
    var monoMatrix = new Array(barkscale.length);
    var sideMatrix = new Array(barkscale.length);
    var monoMeanMatrix= new Array (barkscale.length);
    var monoDeviationMatrix= new Array (barkscale.length);
    var sideMeanMatrix= new Array (barkscale.length);
    var sideDeviationMatrix= new Array (barkscale.length);
    var monoHPMatrix = new Array(barkscale.length);
    var sideHPMatrix = new Array(barkscale.length);
    var monoLPMatrix = new Array(barkscale.length);
    var sideLPMatrix = new Array(barkscale.length);


    function LP(freq,sr){
        this.buf0 = 0
        this.buf1 = 0
        this.buf2 = 0
        this.buf3 = 0
        this.buf4 = 0
        this.buf5 = 0
        this.buf6 = 0
        this.buf7 = 0
        this.cutoff=2*Math.sin(Math.PI*(freq/sr))
    }
    LP.prototype.process=function(sample){
        this.buf0 += this.cutoff * (sample - this.buf0)
        this.buf1 += this.cutoff * (this.buf0 - this.buf1)
        this.buf2 += this.cutoff * (this.buf1 - this.buf2)
        this.buf3 += this.cutoff * (this.buf2 - this.buf3)
        this.buf4 += this.cutoff * (this.buf3 - this.buf4)
        this.buf5 += this.cutoff * (this.buf4 - this.buf5)
        this.buf6 += this.cutoff * (this.buf5 - this.buf6)
        this.buf7 += this.cutoff * (this.buf6 - this.buf7)
        return this.buf1
    }
    LP.prototype.output=function(mode){
        if(mode =="6"){
            return this.buf0
        }
        else if(mode ="12"){
            return this.buf1
        }
        else if(mode ="24"){
            return this.buf3
        }
        else if(mode ="48"){
            return this.buf7
        }
    }
    function HP(freq,sr){
        this.buf0 = 0;
        this.buf1 = 0;
        this.buf2 = 0;
        this.buf3 = 0;
        this.buf4 = 0;
        this.buf5 = 0;
        this.buf6 = 0;
        this.buf7 = 0;
        this.cutoff=2*Math.sin(Math.PI*(freq/sr));
    }
    HP.prototype.process=function(sample){
        this.buf0 += this.cutoff * (sample - this.buf0)
        this.buf1 += this.cutoff * (this.buf0 - this.buf1)
        this.buf2 += this.cutoff * (this.buf1 - this.buf2)
        this.buf3 += this.cutoff * (this.buf2 - this.buf3)
        this.buf4 += this.cutoff * (this.buf3 - this.buf4)
        this.buf5 += this.cutoff * (this.buf4 - this.buf5)
        this.buf6 += this.cutoff * (this.buf5 - this.buf6)
        this.buf7 += this.cutoff * (this.buf6 - this.buf7)
        return (sample - this.buf1)
    }
    HP.prototype.output=function(mode){
        if(mode =="6"){
            return (sample - this.buf0)
        }
        else if(mode ="12"){
            return (sample - this.buf1)
        }
        else if(mode ="24"){
            return (sample - this.buf3)
        }
        else if(mode ="48"){
            return (sample - this.buf7)
        }
    }
    for (var i =0; i<barkscale.length; i++){
        monoMatrix[i]=new Float32Array(origLength)
        sideMatrix[i]=new Float32Array(origLength)
        monoHPMatrix[i]=new HP(barkscale[i],sampleRate)
        sideHPMatrix[i]=new HP(barkscale[i],sampleRate)
        monoLPMatrix[i]=new LP(barkscale[i],sampleRate)
        sideLPMatrix[i]=new LP(barkscale[i],sampleRate)
        monoMeanMatrix[i]=0.0
        sideMeanMatrix[i]=0.0
        monoDeviationMatrix[i]=0.0
        sideDeviationMatrix[i]=0.0
    }           


    // transform left/right to mono/side with zero padding

    for (var i =0; i<origLength; i++){
        console.log('mono side split : ' + i + ' / '+origLength)
        mono[i] = (left[i]+right[i])/2;
        side[i] = left[i]-mono;
    };
    // collecting FFT means for mono and side per bin
    for (var i =0; i<barkscale.length; i++){
    if (i==0){
        for (var j = 0; j<origLength; j++){
            var tempMono =monoLPMatrix[i+1].process(mono[j])
            var tempSide =sideLPMatrix[i+1].process(side[j])
            monoMatrix[i][j]=tempMono
            sideMatrix[i][j]=tempSide
            monoMeanMatrix[i]+=Math.abs(tempMono)/origLength
            sideMeanMatrix[i]+=Math.abs(tempSide)/origLength
        }
    }
    else if(i==barkscale.length-1){
        for (var j = 0; j<origLength; j++){
            var tempMono =monoHPMatrix[i].process(mono[j])
            var tempSide =sideHPMatrix[i].process(side[j])
            monoMatrix[i][j]=tempMono
            sideMatrix[i][j]=tempSide
            monoMeanMatrix[i]+=Math.abs(tempMono)/origLength
            sideMeanMatrix[i]+=Math.abs(tempSide)/origLength
        }
    }
    else{
        for (var j = 0; j<origLength; j++){
            var tempMono = monoLPMatrix[i+1].process(monoHPMatrix[i].process(mono[j]))
            var tempSide = sideLPMatrix[i+1].process(sideHPMatrix[i].process(side[j]))
            monoMatrix[i][j]=tempMono
            sideMatrix[i][j]=tempSide
            monoMeanMatrix[i]+=Math.abs(tempMono)/origLength
            sideMeanMatrix[i]+=Math.abs(tempSide)/origLength
        }
    }
    
    }
    for (var i =0; i<barkscale.length; i++){
        for (var j = 0; j<origLength; j++){
            monoDeviationMatrix[i] +=  (Math.abs(monoMatrix[i][j])-monoMeanMatrix[i])/origLength;
            sideDeviationMatrix[i] +=  (Math.abs(sideMatrix[i][j])-sideMeanMatrix[i])/origLength;
            
        }
    }
  

    
    var t ={
        origLength:origLength,
        mono:mono,
        side:side,
        monoMatrix:monoMatrix,
        sideMatrix:sideMatrix,
        monoMeanMatrix:monoMeanMatrix,
        monoDeviationMatrix:monoDeviationMatrix,
        sideMeanMatrix:sideMeanMatrix,
        sideDeviationMatrix:sideDeviationMatrix
    }
    return t;
    
};
    
function reconstruct(signalTable,referenceTable,desiredSampleRate){
    
    var newLength=signalTable.newLength;
    
    function ratio(bins){
        this.mono=new Float32Array(bins);
        this.side=new Float32Array(bins);
    };
    console.log('referenceTable : '+referenceTable)
    console.log('signalTable : '+signalTable)
    var ratio = new ratio(bins);
    
    for (var i =0; i<bins; i++){
        ratio.mono[i]=referenceTable.monoDeviationMatrix[i]/signalTable.monoDeviationMatrix[i];
        ratio.side[i]=referenceTable.sideDeviationMatrix[i]/signalTable.sideDeviationMatrix[i];
    };
    function soundData(){
        this.left = new Float32Array(signalTable.origLength);
        this.right = new Float32Array(signalTable.origLength);
        this.left.fill(0);
        this.right.fill(0);
    };

    var data= new soundData;


    for (var j =0; j<signalTable.origLength; j++){
    var tempMono = 0;
    var tempSide = 0;
    for(var i = 0; i<bins; i++){
        if(signalTable.monoMatrix[i][j]>0){
            tempMono += (signalTable.monoMatrix[i][j]-signalTable.monoMeanMatrix[i])*ratio.mono[i]+referenceTable.monoMeanMatrix[i]
            if(signalTable.sideMatrix[i][j]>0){
                tempSide += (signalTable.sideMatrix[i][j]-signalTable.sideMeanMatrix[i])*ratio.side[i]+referenceTable.sideMeanMatrix[i]
            }
            else if(signalTable.sideMatrix[i][j]<=0){
                tempSide += (signalTable.sideMatrix[i][j]+signalTable.sideMeanMatrix[i])*ratio.side[i]-referenceTable.sideMeanMatrix[i]
            }  
        }
        else if(signalTable.monoMatrix[i][j]<=0){
            tempMono += (signalTable.monoMatrix[i][j]+signalTable.monoMeanMatrix[i])*ratio.mono[i]-referenceTable.monoMeanMatrix[i]
            if(signalTable.sideMatrix[i][j]>0){
                tempSide += (signalTable.sideMatrix[i][j]-signalTable.sideMeanMatrix[i])*ratio.side[i]+referenceTable.sideMeanMatrix[i]
            }
            else if(signalTable.sideMatrix[i][j]<=0){
                tempSide += (signalTable.sideMatrix[i][j]+signalTable.sideMeanMatrix[i])*ratio.side[i]-referenceTable.sideMeanMatrix[i]
            }  
        }    
    }
    data.left[i]=tempMono+tempSide
    data.right[i]=tempMono-tempSide
    }

    var newLeft = SRConverter(data.left,44100,desiredSampleRate);
    var newRight = SRConverter(data.right,44100,desiredSampleRate);

    var forNumpy = new Array(origLength);
    for (var i =0; i<origLength; i++){
        arrayForNumpy[i]=[newLeft[i],newRight[i]];
    };
    mastered ={
        float:true,
        symmetric:true,
        bitDepth:32,
        sampleRate:44100,
        channelData:[
            newLeft,
            newRight
        ],
        forNumpy:arrayForNumpy,
        sendto:targetaddress
    };
    var masteredJSON = JSON.stringify(mastered);

    /*
    localStorage.setItem('mastered.json',JSON.stringify(mastered))
    */
    return masteredJSON;
    

};
function send_data_to_server(data){
    var request = new XMLHttpRequest();

    "url needs to be updated once flask is deployed"

    request.open('POST','bernardahn.pythonanywhere.com',true);
    request.setRequestHeader("content-type","application/json");
    request.send(data);
};
    
