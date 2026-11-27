# Furqan Cloud Remote Access

AnyDesk/TeamViewer-এর মতো remote desktop। তিনটি অংশ:

- `server/`  — Node.js signaling server (ID, password check, অনুমতি, WebRTC signal relay)
- `app/`     — Electron desktop app (UI + screen capture + mouse/keyboard control)
- স্ক্রিন ও কন্ট্রোল ডাটা server দিয়ে যায় না, সরাসরি WebRTC peer-to-peer

## ১. Server চালানো (VPS বা PC)
    cd server
    npm install
    node server.js          # port 8080

Production-এ nginx/Caddy দিয়ে `wss://remote.yourdomain.com` (SSL) করুন, এবং proxy-তে websocket upgrade চালু রাখুন।

## ২. App চালানো (দুই PC-তেই)
    cd app
    npm install
    # server address দিন (একবার):
    set NIJER_SERVER=ws://SERVER_IP:8080      (Windows cmd)
    npm start

Config ফাইল: `%APPDATA%\furqan-cloud-remote\config.json`  (server, ice/TURN, password এখানে)

## ৩. Windows .exe বানানো
    npm run dist       # dist/ ফোল্ডারে installer

## ৪. ইন্টারনেটে NAT-এর পেছনে কাজ করাতে TURN লাগবে
coturn install করে config.json-এ দিন:
    "ice": [
      {"urls":"stun:stun.l.google.com:19302"},
      {"urls":"turn:YOUR_SERVER:3478","username":"user","credential":"pass"}
    ]

## উইন্ডো সাইজ
ডিফল্ট 1280×720; maximize/full screen করলে পুরো ডেস্কটপ সাইজ। রিমোট স্ক্রিন দেখার সময় নিজে full screen হয়।

## নিরাপত্তা (বাস্তবায়িত)
- Host প্রতিটি connection-এ Accept/Reject করতে হয়
- Session চলাকালীন লাল banner + Disconnect বাটন সবসময় দেখা যায়
- ৫ বার ভুল password হলে ১ মিনিট lock
- Session active না থাকলে মাউস/কিবোর্ড কমান্ড ignore করা হয়
- Password আলাদা করে refresh করা যায়

## পরবর্তী ধাপ
Unattended access, file transfer, clipboard sync, Ctrl+Alt+Del (Windows service দরকার), multi-monitor, user account/login, audio।
