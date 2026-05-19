# 🚀 P2P File Sharing System

A fast, secure, and decentralized Peer-to-Peer (P2P) file sharing application built to transfer files directly between devices without relying on a central cloud storage server.

---

## ✨ Features
- **Direct P2P Transfer:** High-speed file sharing utilizing direct browser-to-browser WebRTC data streams.
- **Secure Authentication:** Temporary dynamic OTP/Key generated for every unique session to pair devices.
- **Clean User Interface:** Minimalist and intuitive WebUI designed for effortless drag-and-drop operations.

---

## 📸 Project Screenshots

### 🖥️ 1. Main Send-File Dashboard
The primary user interface where users can select, drag, and drop files to initiate a peer-to-peer connection.
<img width="958" height="451" alt="image" src="https://github.com/user-attachments/assets/77c5aee4-d6c3-473f-8c9f-64df31d02623" />

### 📊 2. File Loading & Processing Stage
Once the file is successfully loaded by the browser, the system prepares the file metadata and readies the connection sockets.
<img width="947" height="447" alt="image" src="https://github.com/user-attachments/assets/55aa7069-f8b5-4ca5-b703-ab90a51910a2" />

### 📥 3. Receive File Portal
The dedicated interface where the receiver inputs the session-specific connection key/OTP to securely pull data directly from the sender.
<img width="962" height="448" alt="image" src="https://github.com/user-attachments/assets/19d0ca87-93f6-420a-a41f-85ed1fda0240" />

---

## 💻 Tech Stack
- **Backend Framework:** Django / Python
- **Asynchronous Layer:** Django Channels (ASGI) & Daphne Server
- **WebRTC API:** JavaScript (WebSockets for signaling)
- **Database:** SQLite3

## 🚀 Quick Run Commands

Run these quick commands in your terminal to get the project started locally:

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Run Database Migrations
python manage.py makemigrations && python manage.py migrate

# 3. Start the Server
daphne -b 0.0.0.0 -p 8000 p2p_file_sharing.asgi:application
