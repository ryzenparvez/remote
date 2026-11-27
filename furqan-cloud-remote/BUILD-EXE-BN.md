# Furqan Cloud Remote Access — Windows EXE তৈরি

এই ZIP-এ Windows 64-bit NSIS installer তৈরির build configuration প্রস্তুত করা আছে। Installer-এর নাম হবে:

`Furqan Cloud Remote Access Setup 1.0.0.exe`

## পদ্ধতি ১: GitHub Actions দিয়ে (Windows PC ছাড়াই)

1. এই ZIP Extract করুন।
2. GitHub-এ একটি নতুন repository তৈরি করুন।
3. ZIP-এর ভেতরের `furqan-cloud-remote` ফোল্ডারের **সব ফাইল ও `.github` ফোল্ডারসহ** repository-তে upload/commit করুন। Repository-র root-এ `app`, `server`, `build-windows.bat`, `.github` দেখা যেতে হবে।
4. GitHub repository-র **Actions** tab খুলুন। প্রথমবার হলে Actions enable করুন।
5. বাম পাশে **Build Windows EXE** workflow নির্বাচন করুন।
6. **Run workflow** চাপুন, branch হিসেবে `main` রেখে আবার Run workflow দিন। `main` branch-এ commit/push করলেও build স্বয়ংক্রিয়ভাবে চলবে।
7. Build সফল হলে workflow run-এর নিচের **Artifacts** অংশ থেকে `furqan-cloud-remote-setup` ডাউনলোড করুন। ZIP extract করলে `.exe` installer পাবেন।

## পদ্ধতি ২: Windows PC-তে সরাসরি

1. Windows 10/11 64-bit PC-তে Node.js LTS ইনস্টল করুন: https://nodejs.org/
2. এই project ZIP Extract করুন।
3. `build-windows.bat`-এ ডাবল ক্লিক করুন।
4. Build সফল হলে `app\dist\Furqan Cloud Remote Access Setup 1.0.0.exe` তৈরি হবে।

প্রথমবার build করার সময় internet connection প্রয়োজন, কারণ npm packages এবং Electron build tools ডাউনলোড হবে।

## গুরুত্বপূর্ণ

- এই build হলো **desktop app installer**। `server/` আলাদা Node.js signaling server; সেটি PC বা VPS-এ আলাদাভাবে চালাতে হবে।
- Installer 64-bit Windows-এর জন্য।
- Code-signing certificate দেওয়া নেই, তাই Windows SmartScreen অজানা publisher-এর সতর্কতা দেখাতে পারে। এটি নিজে থেকে malware-এর প্রমাণ নয়; শুধু পরিচিত publisher signature নেই বোঝায়।
- Build সফল হওয়া মানেই বাস্তব Windows PC-তে screen capture, mouse/keyboard control, firewall, antivirus এবং দুই নেটওয়ার্কের WebRTC/TURN সংযোগের পরীক্ষা সম্পন্ন হয়েছে—এমন নয়। Install করার পর Host-এর অনুমতি নিয়ে আলাদা Windows PC-তে পরীক্ষা করুন।
- Remote access চালু করার আগে server-এ WSS/SSL, শক্তিশালী account/password policy, firewall restriction এবং TURN credentials নিরাপদভাবে configure করুন।
