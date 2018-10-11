"""
useitlike this
http://127.0.0.1:5000/sendmime?left=number1&right=number2
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from os.path import basename
username = 'my-address@gmail.com'
password = 'top-secret'
default_address = ['my-address2@gmail.com']
def send_mail(send_from: str, subject: str, text: str, 
send_to: list, files= None):

    send_to= default_address if not send_to else send_to

    msg = MIMEMultipart()
    msg['From'] = send_from
    msg['To'] = ', '.join(send_to)  
    msg['Subject'] = subject

    msg.attach(MIMEText(text))

    for f in files or []:
        with open(f, "rb") as fil: 
            ext = f.split('.')[-1:]
            attachedfile = MIMEApplication(fil.read(), _subtype = ext)
            attachedfile.add_header(
                'content-disposition', 'attachment', filename=basename(f) )
        msg.attach(attachedfile)


    smtp = smtplib.SMTP(host="smtp.gmail.com", port= 587) 
    smtp.starttls()
    smtp.login(username,password)
    smtp.sendmail(send_from, send_to, msg.as_string())
    smtp.close()
from scipy.io.wavfile import write
import numpy as np
"""
scipy.io.wavfile.read returns
(44100, array([[0, 0],
       [0, 0],
       [0, 0],
       ...,
       [0, 0],
       [0, 0],
       [0, 0]], dtype=int16))
"""
length=100000

data = np.zeros((length,2),dtype='int16')
data /= np.max(np.abs(data))
data *= 32767
write('master.wav',44100,data)

from flask import Flask, request, jsonify

app= Flask(__name__)
@app.route('/sendmime',methods=['GET'])
def send_mime_email():
    left = request.args.get('left',None)
    right = request.args.get('right',None)

if __name__ == '__main__':
    app.run(debug=True)