
# A very simple Flask Hello World app for you to get started with...
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from os.path import basename
username = 'bernardahn@squwbs.com'
password = 'sodlfdmftksek'
default_address = ['atomme79@gmail.com']
def send_mail(send_from: str, subject: str, text: str, send_to: list, files= None):

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
"""
length=100
data = np.zeros((length,2),dtype='int16')
data /= np.max(np.abs(data))
data *= 32767
write('master.wav',44100,data)
"""
from flask import Flask, request, jsonify

app= Flask(__name__)
@app.route('/sendmime/<uuid>',methods=['GET','POST'])
def send_mime_email(uuid):
    content = request.get_json(silent=False)
    print(content)
    print(uuid)
    length=len(content.forNumpy)
    data = np.zeros((length,2),dtype='int16')
    sendto = content.sendto
    for i in len(content.forNumpy):
        data[i]=content.forNumpy[i]
    """
    left = request.args.get('left',None)
    right = request.args.get('right',None)
    """
    write('master.wav',44100,data)
    send_mail('bernardahn@squwbs.com','Your Mastered Sound File Is Here!', 'Download the attached file! Enjoy!', sendto, '/master.wav')
if __name__ == '__main__':
    app.run()
