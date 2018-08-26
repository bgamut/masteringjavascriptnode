var reader=new FileReader;
var progress = document.querySelector('.percent');
window.AudioContext = window.AudioContext || window.webkitAudioContext;
var context = new AudioContext();

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

    //var intBuffer= new Int16Array(arrayBuffer)
    //console.log(intBuffer)
    contex.decodeAudioData(arrayBuffer,(
        function(buffer){
            sound=buffer;
        },onError));
    console.log(sound)
    }

    


}

