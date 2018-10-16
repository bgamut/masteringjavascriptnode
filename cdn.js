var reader=new FileReader;
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

  function setTargetAddress(){
      targetaddress = document.getElementById("targetemail").value;
  };

  function miniFFT(re, im) {
      var N = re.length;
      for (var i = 0; i < N; i++) {
          for(var j = 0, h = i, k = N; k >>= 1; h >>= 1){
              j = (j << 1) | (h & 1);
          };
          if (j > i) {
              re[j] = [re[i], re[i] = re[j]][0]
              im[j] = [im[i], im[i] = im[j]][0]
          };
      };
      for(var hN = 1; hN * 2 <= N; hN *= 2){
          for (var i = 0; i < N; i += hN * 2){
              for (var j = i; j < i + hN; j++) {
                  var cos = Math.cos(Math.PI * (j - i) / hN);
                  var sin = Math.sin(Math.PI * (j - i) / hN);
                  var tre =  re[j+hN] * cos + im[j+hN] * sin;
                  var tim = -re[j+hN] * sin + im[j+hN] * cos;
                  re[j + hN] = re[j] - tre; im[j + hN] = im[j] - tim;
                  re[j] += tre; im[j] += tim;
              };
            };
        };
  };
  function miniDCT(s){
      var N = s.length;
      var K = -Math.PI / (2 * N);
      var re = new Float64Array(N);
      var im = new Float64Array(N);
      for(var i = 0, j = N; j > i; i++){
          re[i] = s[i * 2]
          re[--j] = s[i * 2 + 1]
      };
      miniFFT(re, im)
      for(var i = 0; i < N; i++){
          s[i] = 2*re[i]*Math.cos(K*i)-2*im[i]*Math.sin(K*i);
    };
  };

  function miniIDCT(s){
      var N = s.length;
      var K = Math.PI / (2 * N);
      var im = new Float64Array(N);
      var re = new Float64Array(N);
      re[0] = s[0] / N / 2;
      for(var i = 1; i < N; i++){
          var im2 = Math.sin(i*K);
          var re2 = Math.cos(i*K);
          re[i] = (s[N - i] * im2 + s[i] * re2) / N / 2;
          im[i] = (im2 * s[i] - s[N - i] * re2) / N / 2;
      };
      miniFFT(im, re)
      for(var i = 0; i < N / 2; i++){
          s[2 * i] = re[i];
          s[2 * i + 1] = re[N - i - 1];
      };
  };
  function FFT(size) {
      this.size = size | 0;
      if (this.size <= 1 || (this.size & (this.size - 1)) !== 0){
        throw new Error('FFT size must be a power of two and bigger than 1');
      };
      this._csize = size << 1;
    
      // NOTE: Use of `var` is intentional for old V8 versions
      var table = new Array(this.size * 2);
      for (var i = 0; i < table.length; i += 2) {
        const angle = Math.PI * i / this.size;
        table[i] = Math.cos(angle);
        table[i + 1] = -Math.sin(angle);
      };
      this.table = table;
    
      // Find size's power of two
      var power = 0;
      for (var t = 1; this.size > t; t <<= 1){
        power++;
      };
      // Calculate initial step's width:
      //   * If we are full radix-4 - it is 2x smaller to give inital len=8
      //   * Otherwise it is the same as `power` to give len=4
      this._width = power % 2 === 0 ? power - 1 : power;
    
      // Pre-compute bit-reversal patterns
      this._bitrev = new Array(1 << this._width);
      for (var j = 0; j < this._bitrev.length; j++) {
        this._bitrev[j] = 0;
        for (var shift = 0; shift < this._width; shift += 2) {
          var revShift = this._width - shift - 2;
          this._bitrev[j] |= ((j >>> shift) & 3) << revShift;
        };
      };
    
      this._out = null;
      this._data = null;
      this._inv = 0;
    };
    /*
    module.exports = FFT;
    */
    FFT.prototype.fromComplexArray = function fromComplexArray(complex, storage) {
      var res = storage || new Array(complex.length >>> 1);
      for (var i = 0; i < complex.length; i += 2){
        res[i >>> 1] = complex[i];
      };
      return res;
    };
    
    FFT.prototype.createComplexArray = function createComplexArray() {
      const res = new Array(this._csize);
      for (var i = 0; i < res.length; i++){
        res[i] = 0;
      };
      return res;
    };
    
    FFT.prototype.toComplexArray = function toComplexArray(input, storage) {
      var res = storage || this.createComplexArray();
      for (var i = 0; i < res.length; i += 2) {
        res[i] = input[i >>> 1];
        res[i + 1] = 0;
      };
      return res;
    };
    
    FFT.prototype.completeSpectrum = function completeSpectrum(spectrum) {
      var size = this._csize;
      var half = size >>> 1;
      for (var i = 2; i < half; i += 2) {
        spectrum[size - i] = spectrum[i];
        spectrum[size - i + 1] = -spectrum[i + 1];
      };
    };
    
    FFT.prototype.transform = function transform(out, data) {
      if (out === data){
        throw new Error('Input and output buffers must be different');
      };
      this._out = out;
      this._data = data;
      this._inv = 0;
      this._transform4();
      this._out = null;
      this._data = null;
    };
    
    FFT.prototype.realTransform = function realTransform(out, data) {
      if (out === data){
        throw new Error('Input and output buffers must be different');
      };
      this._out = out;
      this._data = data;
      this._inv = 0;
      this._realTransform4();
      this._out = null;
      this._data = null;
    };
    
    FFT.prototype.inverseTransform = function inverseTransform(out, data) {
      if (out === data){
        throw new Error('Input and output buffers must be different');
      };
      this._out = out;
      this._data = data;
      this._inv = 1;
      this._transform4();
      for (var i = 0; i < out.length; i++){
        out[i] /= this.size;
      };
      this._out = null;
      this._data = null;
    };
    
    // radix-4 implementation
    //
    // NOTE: Uses of `var` are intentional for older V8 version that do not
    // support both `let compound assignments` and `const phi`
    FFT.prototype._transform4 = function _transform4() {
      var out = this._out;
      var size = this._csize;
    
      // Initial step (permute and transform)
      var width = this._width;
      var step = 1 << width;
      var len = (size / step) << 1;
    
      var outOff;
      var t;
      var bitrev = this._bitrev;
      if (len === 4) {
        for (outOff = 0, t = 0; outOff < size; outOff += len, t++) {
          const off = bitrev[t];
          this._singleTransform2(outOff, off, step);
        };
      } else {
        // len === 8
        for (outOff = 0, t = 0; outOff < size; outOff += len, t++) {
          const off = bitrev[t];
          this._singleTransform4(outOff, off, step);
        };
      };
    
      // Loop through steps in decreasing order
      var inv = this._inv ? -1 : 1;
      var table = this.table;
      for (step >>= 2; step >= 2; step >>= 2) {
        len = (size / step) << 1;
        var quarterLen = len >>> 2;
    
        // Loop through offsets in the data
        for (outOff = 0; outOff < size; outOff += len) {
          // Full case
          var limit = outOff + quarterLen;
          for (var i = outOff, k = 0; i < limit; i += 2, k += step) {
            const A = i;
            const B = A + quarterLen;
            const C = B + quarterLen;
            const D = C + quarterLen;
    
            // Original values
            const Ar = out[A];
            const Ai = out[A + 1];
            const Br = out[B];
            const Bi = out[B + 1];
            const Cr = out[C];
            const Ci = out[C + 1];
            const Dr = out[D];
            const Di = out[D + 1];
    
            // Middle values
            const MAr = Ar;
            const MAi = Ai;
    
            const tableBr = table[k];
            const tableBi = inv * table[k + 1];
            const MBr = Br * tableBr - Bi * tableBi;
            const MBi = Br * tableBi + Bi * tableBr;
    
            const tableCr = table[2 * k];
            const tableCi = inv * table[2 * k + 1];
            const MCr = Cr * tableCr - Ci * tableCi;
            const MCi = Cr * tableCi + Ci * tableCr;
    
            const tableDr = table[3 * k];
            const tableDi = inv * table[3 * k + 1];
            const MDr = Dr * tableDr - Di * tableDi;
            const MDi = Dr * tableDi + Di * tableDr;
    
            // Pre-Final values
            const T0r = MAr + MCr;
            const T0i = MAi + MCi;
            const T1r = MAr - MCr;
            const T1i = MAi - MCi;
            const T2r = MBr + MDr;
            const T2i = MBi + MDi;
            const T3r = inv * (MBr - MDr);
            const T3i = inv * (MBi - MDi);
    
            // Final values
            const FAr = T0r + T2r;
            const FAi = T0i + T2i;
    
            const FCr = T0r - T2r;
            const FCi = T0i - T2i;
    
            const FBr = T1r + T3i;
            const FBi = T1i - T3r;
    
            const FDr = T1r - T3i;
            const FDi = T1i + T3r;
    
            out[A] = FAr;
            out[A + 1] = FAi;
            out[B] = FBr;
            out[B + 1] = FBi;
            out[C] = FCr;
            out[C + 1] = FCi;
            out[D] = FDr;
            out[D + 1] = FDi;
          };
        };
      };
    };
    
    // radix-2 implementation
    //
    // NOTE: Only called for len=4
    FFT.prototype._singleTransform2 = function _singleTransform2(outOff, off, step) {
      const out = this._out;
      const data = this._data;
    
      const evenR = data[off];
      const evenI = data[off + 1];
      const oddR = data[off + step];
      const oddI = data[off + step + 1];
    
      const leftR = evenR + oddR;
      const leftI = evenI + oddI;
      const rightR = evenR - oddR;
      const rightI = evenI - oddI;
    
      out[outOff] = leftR;
      out[outOff + 1] = leftI;
      out[outOff + 2] = rightR;
      out[outOff + 3] = rightI;
    };
    
    // radix-4
    //
    // NOTE: Only called for len=8
    FFT.prototype._singleTransform4 = function _singleTransform4(outOff, off, step) {
      const out = this._out;
      const data = this._data;
      const inv = this._inv ? -1 : 1;
      const step2 = step * 2;
      const step3 = step * 3;
    
      // Original values
      const Ar = data[off];
      const Ai = data[off + 1];
      const Br = data[off + step];
      const Bi = data[off + step + 1];
      const Cr = data[off + step2];
      const Ci = data[off + step2 + 1];
      const Dr = data[off + step3];
      const Di = data[off + step3 + 1];
    
      // Pre-Final values
      const T0r = Ar + Cr;
      const T0i = Ai + Ci;
      const T1r = Ar - Cr;
      const T1i = Ai - Ci;
      const T2r = Br + Dr;
      const T2i = Bi + Di;
      const T3r = inv * (Br - Dr);
      const T3i = inv * (Bi - Di);
    
      // Final values
      const FAr = T0r + T2r;
      const FAi = T0i + T2i;
    
      const FBr = T1r + T3i;
      const FBi = T1i - T3r;
    
      const FCr = T0r - T2r;
      const FCi = T0i - T2i;
    
      const FDr = T1r - T3i;
      const FDi = T1i + T3r;
    
      out[outOff] = FAr;
      out[outOff + 1] = FAi;
      out[outOff + 2] = FBr;
      out[outOff + 3] = FBi;
      out[outOff + 4] = FCr;
      out[outOff + 5] = FCi;
      out[outOff + 6] = FDr;
      out[outOff + 7] = FDi;
    };
    
    // Real input radix-4 implementation
    FFT.prototype._realTransform4 = function _realTransform4() {
      var out = this._out;
      var size = this._csize;
    
      // Initial step (permute and transform)
      var width = this._width;
      var step = 1 << width;
      var len = (size / step) << 1;
    
      var outOff;
      var t;
      var bitrev = this._bitrev;
      if (len === 4) {
        for (outOff = 0, t = 0; outOff < size; outOff += len, t++) {
          const off = bitrev[t];
          this._singleRealTransform2(outOff, off >>> 1, step >>> 1);
        };
      } else {
        // len === 8
        for (outOff = 0, t = 0; outOff < size; outOff += len, t++) {
          const off = bitrev[t];
          this._singleRealTransform4(outOff, off >>> 1, step >>> 1);
        };
      };
    
      // Loop through steps in decreasing order
      var inv = this._inv ? -1 : 1;
      var table = this.table;
      for (step >>= 2; step >= 2; step >>= 2) {
        len = (size / step) << 1;
        var halfLen = len >>> 1;
        var quarterLen = halfLen >>> 1;
        var hquarterLen = quarterLen >>> 1;
    
        // Loop through offsets in the data
        for (outOff = 0; outOff < size; outOff += len) {
          for (var i = 0, k = 0; i <= hquarterLen; i += 2, k += step) {
            var A = outOff + i;
            var B = A + quarterLen;
            var C = B + quarterLen;
            var D = C + quarterLen;
    
            // Original values
            var Ar = out[A];
            var Ai = out[A + 1];
            var Br = out[B];
            var Bi = out[B + 1];
            var Cr = out[C];
            var Ci = out[C + 1];
            var Dr = out[D];
            var Di = out[D + 1];
    
            // Middle values
            var MAr = Ar;
            var MAi = Ai;
    
            var tableBr = table[k];
            var tableBi = inv * table[k + 1];
            var MBr = Br * tableBr - Bi * tableBi;
            var MBi = Br * tableBi + Bi * tableBr;
    
            var tableCr = table[2 * k];
            var tableCi = inv * table[2 * k + 1];
            var MCr = Cr * tableCr - Ci * tableCi;
            var MCi = Cr * tableCi + Ci * tableCr;
    
            var tableDr = table[3 * k];
            var tableDi = inv * table[3 * k + 1];
            var MDr = Dr * tableDr - Di * tableDi;
            var MDi = Dr * tableDi + Di * tableDr;
    
            // Pre-Final values
            var T0r = MAr + MCr;
            var T0i = MAi + MCi;
            var T1r = MAr - MCr;
            var T1i = MAi - MCi;
            var T2r = MBr + MDr;
            var T2i = MBi + MDi;
            var T3r = inv * (MBr - MDr);
            var T3i = inv * (MBi - MDi);
    
            // Final values
            var FAr = T0r + T2r;
            var FAi = T0i + T2i;
    
            var FBr = T1r + T3i;
            var FBi = T1i - T3r;
    
            out[A] = FAr;
            out[A + 1] = FAi;
            out[B] = FBr;
            out[B + 1] = FBi;
    
            // Output final middle point
            if (i === 0) {
              var FCr = T0r - T2r;
              var FCi = T0i - T2i;
              out[C] = FCr;
              out[C + 1] = FCi;
              continue;
            };
    
            // Do not overwrite ourselves
            if (i === hquarterLen){
              continue;
            };
            // In the flipped case:
            // MAi = -MAi
            // MBr=-MBi, MBi=-MBr
            // MCr=-MCr
            // MDr=MDi, MDi=MDr
            var ST0r = T1r;
            var ST0i = -T1i;
            var ST1r = T0r;
            var ST1i = -T0i;
            var ST2r = -inv * T3i;
            var ST2i = -inv * T3r;
            var ST3r = -inv * T2i;
            var ST3i = -inv * T2r;
    
            var SFAr = ST0r + ST2r;
            var SFAi = ST0i + ST2i;
    
            var SFBr = ST1r + ST3i;
            var SFBi = ST1i - ST3r;
    
            var SA = outOff + quarterLen - i;
            var SB = outOff + halfLen - i;
    
            out[SA] = SFAr;
            out[SA + 1] = SFAi;
            out[SB] = SFBr;
            out[SB + 1] = SFBi;
          };
        };
      };
    };
    
    // radix-2 implementation
    //
    // NOTE: Only called for len=4
    FFT.prototype._singleRealTransform2 = function _singleRealTransform2(outOff,off,step) {
      const out = this._out;
      const data = this._data;
    
      const evenR = data[off];
      const oddR = data[off + step];
    
      const leftR = evenR + oddR;
      const rightR = evenR - oddR;
    
      out[outOff] = leftR;
      out[outOff + 1] = 0;
      out[outOff + 2] = rightR;
      out[outOff + 3] = 0;
    };
    
    // radix-4
    //
    // NOTE: Only called for len=8
    FFT.prototype._singleRealTransform4 = function _singleRealTransform4(outOff,off,step) {
      const out = this._out;
      const data = this._data;
      const inv = this._inv ? -1 : 1;
      const step2 = step * 2;
      const step3 = step * 3;
    
      // Original values
      const Ar = data[off];
      const Br = data[off + step];
      const Cr = data[off + step2];
      const Dr = data[off + step3];
    
      // Pre-Final values
      const T0r = Ar + Cr;
      const T1r = Ar - Cr;
      const T2r = Br + Dr;
      const T3r = inv * (Br - Dr);
    
      // Final values
      const FAr = T0r + T2r;
    
      const FBr = T1r;
      const FBi = -T3r;
    
      const FCr = T0r - T2r;
    
      const FDr = T1r;
      const FDi = T3r;
    
      out[outOff] = FAr;
      out[outOff + 1] = 0;
      out[outOff + 2] = FBr;
      out[outOff + 3] = FBi;
      out[outOff + 4] = FCr;
      out[outOff + 5] = 0;
      out[outOff + 6] = FDr;
      out[outOff + 7] = FDi;
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
  var readButtonPressed = function(){
    return new Promise(function (resolve, reject){
    resolve('done');
    reject('rejected')
  })}
  var finalFrontier = function(){
    readButtonPressed.then(function(val){ 
        tabulation()
        console.log('initiating json data sending')
        var JSONdata = reconstruct(mainTable,referenceTable,44100);
        setTargetAddress();
        send_data_to_server(JSONdata,targetaddress);
        resolve('done');
        reject('rejected')
    })}

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
      /*
      reader.onloadstart = function(e) {
          document.getElementById('progress_bar').className = 'loading';
      };
      */
      reader.onload = function(e) {
      var arrayBuffer = this.result;
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
          if(mainOnline === true && referenceOnline === true){
             console.log("and and")
          };
      });
  };


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
  var bins = 1024;
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
      var newLength = origLength+(bins-(origLength%bins));
      var mono = new Float64Array(newLength);
      var side = new Float64Array(newLength);
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
          console.log(origLength);
          console.log(newLength);
          console.log(iterations);
          /*
          this.it= new Array(iterations)
          */
          this.it = new Array(iterations);
          /*
          for (var i=0; i<iterations; i+=1){
              this.it[i]=new Array(bins);
          }
          for (var i=0; i<iterations; i+=1){
              for (var j=0; j<bins; j+=1){
                  this.it[i][j]=new bin();
              }
          }
          */
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
              };
          };
      };
      /*
      function evt(){
          this.total = 0;
          this.loaded=0;
      }
      var evt = new evt;
      var t = new t;
    

      evt.total=iterations;
      */
      // transform left/right to mono/side with zero padding
      var t = new t;
      for (var i =0; i<origLength; i++){
          console.log('mono side split : ' + i + ' / '+origLength)
          mono[i+bins/2] = (left[i]+right[i])/2;
          side[i+bins/2] = left[i]-mono;
      };
      // collecting FFT means for mono and side per bin
      for (var i = 0; i<iterations; i++){
          var monoBin = new baseComplexArray(bins);
          var sideBin = new baseComplexArray(bins);
          console.log('iteration : ' + i + ' / '+iterations)
          for (var j = 0; j<bins; j++){
              monoBin.real[j]=mono[bins/2*i+j]*Math.sin(j/(bins-1)*Math.PI);
              sideBin.real[j]=side[bins/2*i+j]*Math.sin(j/(bins-1)*Math.PI);
              t.it[i].bin[j].mono=mono[bins*i+j];
              t.it[i].bin[j].side=side[bins*i+j];
              console.log('copy bin : ' + i+ '-' + j + ' / '+bins)
          };
          monoBin.FFT();
          sideBin.FFT();

          //accumulate mean per bin per iterations and get over all mean in the end
          for (var k = 0; k<bins; k++){
            console.log('FFT bin : '+ i+ '-' + j + ' / '+bins)
              t.it[i].bin[k].monoFFTReal=monoBin.real[k];
              t.it[i].bin[k].sideFFTReal=sideBin.real[k];
              
              t.it[i].bin[k].monoFFTImag=monoBin.imag[k];
              t.it[i].bin[k].sideFFTImag=sideBin.imag[k];

              t.it[i].bin[k].monoFFTAmp = Math.sqrt(Math.pow(reMono[k],2)+Math.pow(imMono[k],2));
              t.it[i].bin[k].sideFFTAmp = Math.sqrt(Math.pow(reSide[k],2)+Math.pow(imSide[k],2));

              t.monoFFTMean[k]+=t.it[i].bin[k].monoFFTAmp/iterations;
              t.sideFFTMean[k]+=t.it[i].bin[k].sideFFTAmp/iterations;
          };
          //evt.loaded=evt.loaded+1;
          //updateProgress(evt)
      };
      // collecting standard deviation value for middle and side
      for (var i = 0; i<iterations; i++){
          for (var j = 0; j<bins; j++){
              t.monoFFTSD[j]+=Math.abs(t.it[i].monoFFTMean[j]-t.it[i].bin[j].monoFFTAmp)/iterations;
              t.sideFFTSD[j]+=Math.abs(t.it[i].sideFFTMean[j]-t.it[i].bin[j].sideFFTAmp)/iterations;
          };
      };

      return t;
      
  };
      
      
      
  function reconstruct(signalTable,referenceTable,desiredSampleRate){
      
      var newLength=signalTable.newLength;
      
      function ratio(bins){
          this.mono=new Float32Array(bins);
          this.side=new Float32Array(bins);
      };

      var ratio = new ratio(bins);
      
      for (var i =0; i<bins; i++){
          ratio.mono[i]=referenceTable.monoFFTMean[i]/signalTable.monoFFTMean[i];
          ratio.side[i]=referenceTable.sideFFTMean[i]/signalTable.sideFFTMean[i];
      };
      function soundData(){
          this.left = Float32Array(signalTable.origLength);
          this.right = Float32Array(signalTable.origLength);
          this.left.fill(0);
          this.right.fill(0);
      };

      var data= new soundData;

      var iterations = signalTable.it.length;


      var left = new Float32Array(signalTable.newLength);
      var right = new Float32Array(signalTable.newLength);
      left.fill(0);
      right.fill(0);

      for (var i =0; i<iterations; i++){
          var monoSliver = new baseComplexArray(bins);
          var sideSliver = new baseComplexArray(bins);
          for(var j = 0; j<bins; j++){
              monoSliver.real[j]=siginalTable.it[i].bin[j].monoFFTReal*ratio.mono[j];
              monoSliver.imag[j]=siginalTable.it[i].bin[j].monoFFTImag*ratio.mono[j];
              sideSliver.real[j]=siginalTable.it[i].bin[j].sideFFTReal*ratio.side[j];
              sideSliver.imag[j]=siginalTable.it[i].bin[j].sideFFTImag*ratio.side[j];
          };
          monoSliver.InvFFT(monoSliverReal,monoSliverImag);
          sideSliver.InvFFT(sideSliverReal,sideSliverImag);
          for(var j = 0; j<bins; j++){
              left[i*bins/2+k]+=monoSliver.real[k]+sideSliver.real[k];
              right[i*bins/2+k]+=monoSliver.real[k]-sideSliver.real[k];
          };
      };

      for (var i = 0; i<origLength; i++){
          data.left[i]= left[bins/2+i];
          data.right[i]= right[bins/2+i];
      };

      var newLeft = SRConverter(data.left,44100,desiredSampleRate);
      var newRight = SRConverter(data.right,44100,desiredSampleRate);

      var forNumpy = new Array(origLength);
      for (var i =0; i<origLength; i++){
          arrayForNumpy[i]=[newLeft[i],newRight[i]];
      };
      var mastered ={
          float:true,
          symmetric:true,
          bitDepth:32,
          sampleRate:44100,
          channelData:[
              newLeft,
              newRight
          ],
          forNumpy:arrayForNumpy,
          sendto:null
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
    

  class baseComplexArray {
      constructor(other, arrayType = Float32Array) {
        if (other instanceof ComplexArray) {
          // Copy constuctor.
          this.ArrayType = other.ArrayType;
          this.real = new this.ArrayType(other.real);
          this.imag = new this.ArrayType(other.imag);
        } else {
          this.ArrayType = arrayType;
          // other can be either an array or a number.
          this.real = new this.ArrayType(other);
          this.imag = new this.ArrayType(this.real.length);
        }
    
        this.length = this.real.length;
      }
    
      toString() {
        const components = [];
    
        this.forEach((value, i) => {
          components.push(
            `(${value.real.toFixed(2)}, ${value.imag.toFixed(2)})`
          );
        });
    
        return `[${components.join(', ')}]`;
      };
    
      forEach(iterator) {
        const n = this.length;
        // For gc efficiency, re-use a single object in the iterator.
        const value = Object.seal(Object.defineProperties({}, {
          real: {writable: true}, imag: {writable: true},
        }));
    
        for (let i = 0; i < n; i++) {
          value.real = this.real[i];
          value.imag = this.imag[i];
          iterator(value, i, n);
        };
      };
    
      // In-place mapper.
      map(mapper) {
        this.forEach((value, i, n) => {
          mapper(value, i, n);
          this.real[i] = value.real;
          this.imag[i] = value.imag;
        });
    
        return this;
      };
    
      conjugate() {
        return new ComplexArray(this).map((value) => {
          value.imag *= -1;
        });
      };
    
      magnitude() {
        const mags = new this.ArrayType(this.length);
    
        this.forEach((value, i) => {
          mags[i] = Math.sqrt(value.real*value.real + value.imag*value.imag);
        });
    
        return mags;
      };
    };
  const PI = Math.PI;
  const SQRT1_2 = Math.SQRT1_2;
    

  class ComplexArray extends baseComplexArray {
      FFT() {
          return fft(this, false);
      };

      InvFFT() {
          return fft(this, true);
      };

      // Applies a frequency-space filter to input, and returns the real-space
      // filtered input.
      // filterer accepts freq, i, n and modifies freq.real and freq.imag.
      frequencyMap(filterer) {
          return this.FFT().map(filterer).InvFFT();
      };
  };
    
    function ensureComplexArray(input) {
      return input instanceof ComplexArray && input || new ComplexArray(input);
    };
    
    function fft(input, inverse) {
      const n = input.length;
    
      if (n & (n - 1)) {
        return FFT_Recursive(input, inverse);
      } else {
        return FFT_2_Iterative(input, inverse);
      };
    };
    
    function FFT_Recursive(input, inverse) {
      const n = input.length;
    
      if (n === 1) {
        return input;
      };
    
      const output = new ComplexArray(n, input.ArrayType);
    
      // Use the lowest odd factor, so we are able to use FFT_2_Iterative in the
      // recursive transforms optimally.
      const p = LowestOddFactor(n);
      const m = n / p;
      const normalisation = 1 / Math.sqrt(p);
      let recursive_result = new ComplexArray(m, input.ArrayType);
    
      // Loops go like O(n Σ p_i), where p_i are the prime factors of n.
      // for a power of a prime, p, this reduces to O(n p log_p n)
      for(let j = 0; j < p; j++) {
        for(let i = 0; i < m; i++) {
          recursive_result.real[i] = input.real[i * p + j];
          recursive_result.imag[i] = input.imag[i * p + j];
        };
        // Don't go deeper unless necessary to save allocs.
        if (m > 1) {
          recursive_result = fft(recursive_result, inverse);
        };
    
        const del_f_r = Math.cos(2*PI*j/n);
        const del_f_i = (inverse ? -1 : 1) * Math.sin(2*PI*j/n);
        let f_r = 1;
        let f_i = 0;
    
        for(let i = 0; i < n; i++) {
          const _real = recursive_result.real[i % m];
          const _imag = recursive_result.imag[i % m];
    
          output.real[i] += f_r * _real - f_i * _imag;
          output.imag[i] += f_r * _imag + f_i * _real;
    
          
          [f_r, f_i] = [
            f_r * del_f_r - f_i * del_f_i,
            f_i = f_r * del_f_i + f_i * del_f_r,
          ];
        
        };
      };
    
      // Copy back to input to match FFT_2_Iterative in-placeness
      // TODO: faster way of making this in-place?
      for(let i = 0; i < n; i++) {
        input.real[i] = normalisation * output.real[i];
        input.imag[i] = normalisation * output.imag[i];
      };
    
      return input;
    };
    
    function FFT_2_Iterative(input, inverse) {
      const n = input.length;
    
      const output = BitReverseComplexArray(input);
      const output_r = output.real;
      const output_i = output.imag;
      // Loops go like O(n log n):
      //   width ~ log n; i,j ~ n
      let width = 1;
      while (width < n) {
        const del_f_r = Math.cos(PI/width);
        const del_f_i = (inverse ? -1 : 1) * Math.sin(PI/width);
        for (let i = 0; i < n/(2*width); i++) {
          let f_r = 1;
          let f_i = 0;
          for (let j = 0; j < width; j++) {
            const l_index = 2*i*width + j;
            const r_index = l_index + width;
    
            const left_r = output_r[l_index];
            const left_i = output_i[l_index];
            const right_r = f_r * output_r[r_index] - f_i * output_i[r_index];
            const right_i = f_i * output_r[r_index] + f_r * output_i[r_index];
    
            output_r[l_index] = SQRT1_2 * (left_r + right_r);
            output_i[l_index] = SQRT1_2 * (left_i + right_i);
            output_r[r_index] = SQRT1_2 * (left_r - right_r);
            output_i[r_index] = SQRT1_2 * (left_i - right_i);
    
            [f_r, f_i] = [
              f_r * del_f_r - f_i * del_f_i,
              f_r * del_f_i + f_i * del_f_r,
            ];
          };
        };
        width <<= 1;
      };
    
      return output;
    };
    
    function BitReverseIndex(index, n) {
      let bitreversed_index = 0;
    
      while (n > 1) {
        bitreversed_index <<= 1;
        bitreversed_index += index & 1;
        index >>= 1;
        n >>= 1;
      };
      return bitreversed_index;
    };
    
    function BitReverseComplexArray(array) {
      const n = array.length;
      const flips = new Set();
    
      for(let i = 0; i < n; i++) {
        const r_i = BitReverseIndex(i, n);
    
        if (flips.has(i)) continue;
    
        [array.real[i], array.real[r_i]] = [array.real[r_i], array.real[i]];
        [array.imag[i], array.imag[r_i]] = [array.imag[r_i], array.imag[i]];
    
        flips.add(r_i);
      };
    
      return array;
    };
    
  function LowestOddFactor(n) {
      const sqrt_n = Math.sqrt(n);
      let factor = 3;
    
      while(factor <= sqrt_n) {
        if (n % factor === 0) return factor;
        factor += 2;
      };
      return n;
    };
  function FFT(input) {
    return ensureComplexArray(input).FFT();
  };
      
  function InvFFT(input) {
    return ensureComplexArray(input).InvFFT();
  };
      
  function frequencyMap(input, filterer) {
      return ensureComplexArray(input).frequencyMap(filterer);
  };

    document.getElementById('referencefile').addEventListener('change', handleReferenceFileSelect, false);
    document.getElementById('mainfile').addEventListener('change', handleMainFileSelect, false);
