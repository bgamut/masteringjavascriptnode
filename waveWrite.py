import wave, struct, math

def packSoundFrame(nChannels,sampleWidth,values):

    formats = (None,'B','h',None,'l')
    offsets = (None,127, 0, None,0)

    format = '<'+formats[sampleWidth]*nChannels
    offset = offsets[sampleWidth]
    volume = 2**(8*sampleWidth-1) - 1

    args = [format]
    for value in values:
        args.append(int(offset + volume*value))
    return struct.pack( *args )

sampleRate = 44100.0 # hertz
duration = 1.0       # seconds
lFreq =  880.00        # A
rFreq = 1760.00        # A

# 8 bit stereo sound
sampleWidth = 4
nChannels = 1

wavef = wave.open('sound.wav','w')
wavef.setnchannels(nChannels) # stereo
wavef.setsampwidth(sampleWidth)
wavef.setframerate(sampleRate)

'nSamples = duration * sampleRate'
nSamples =8
for i in range(int(nSamples)):
    l = -1*i/8
    r = 1*i/8
    if(nChannels==2):
        data = packSoundFrame(nChannels, sampleWidth, [l,r])

    else:
        data = packSoundFrame(nChannels, sampleWidth, [l])


    wavef.writeframesraw( data )
wavef.close()