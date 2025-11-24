# 🏆 League ACC Manager (LoL Rank Tracker)

![Python](https://img.shields.io/badge/Python-3.13-blue?style=for-the-badge&logo=python&logoColor=white)
![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS-lightgrey?style=for-the-badge)
![Security](https://img.shields.io/badge/Security-Fernet%20Encryption-green?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-orange?style=for-the-badge)

> **[TR]** League of Legends hesaplarınızı tek bir merkezden yönetin, liglerini takip edin, kazanma oranlarını analiz edin ve hesap bilgilerinizi şifreli bir şekilde saklayın.
>
> **[EN]** Manage your League of Legends accounts from a single hub, track their ranks, analyze win rates, and store your credentials securely with encryption.

---

## 📸 Screenshots / Ekran Görüntüleri

<div align="center">
  <table>
    <tr>
      <td align="center">
        <img src="screenshots/main_ui.png" alt="Main Interface" width="400"/>
        <br />
        <b>Main Dashboard / Ana Panel</b>
      </td>
      <td align="center">
        <img src="screenshots/add_account.png" alt="Add Account" width="400"/>
        <br />
        <b>Secure Entry / Güvenli Ekleme</b>
      </td>
    </tr>
     <tr>
      <td align="center">
        <img src="screenshots/settings.png" alt="Settings" width="400"/>
        <br />
        <b>API Settings / Ayarlar</b>
      </td>
      <td align="center">
        <img src="screenshots/edit_account.png" alt="Account Details" width="400"/>
        <br />
        <b>Details & Actions / Detaylar</b>
      </td>
    </tr>
  </table>
</div>

---

## 🔒 Güvenlik ve Gizlilik (Security & Privacy)

### Verileriniz Nereye Gidiyor?
* **Hiçbir Yere.** Hesap kullanıcı adlarınız, şifreleriniz veya notlarınız **asla** internete yüklenmez, bir sunucuya gönderilmez veya üçüncü şahıslarla paylaşılmaz.
* Tüm veriler sadece **sizin bilgisayarınızda** (`accounts_db.json` dosyasında) saklanır.

### Şifreleme Teknolojisi
Veritabanı dosyanız (`accounts_db.json`) not defteri ile açıldığında okunamaz. Uygulama, Python'un `cryptography` kütüphanesindeki **Fernet (Simetrik Şifreleme)** algoritmasını kullanır.
* Uygulama ilk açıldığında bilgisayarınıza özel benzersiz bir **Anahtar (Key)** üretir.
* Şifreleriniz bu anahtar ile **AES-128** standardında şifrelenir.
* Bu anahtar olmadan veritabanı dosyası çözülemez.

---

## 🇹🇷 TÜRKÇE (Turkish)

### 🌟 Özellikler
* **📊 Rank & LP Takibi:** Riot API entegrasyonu ile hesaplarınızın güncel Lig, Aşama ve LP bilgisini anlık olarak çeker.
* **🎨 Dinamik Arayüz:** Hesabın ligine göre (Gold, Diamond, Challenger vb.) kartların çerçeve rengi otomatik değişir.
* **📈 Winrate Analizi:** Sezonluk kazanma oranını ve toplam kazanılan/kaybedilen maç sayısını hesaplar.
* **🟢 Aktiflik Durumu:** Hesabın en son ne zaman maç attığını analiz eder (Örn: "Bugün", "3 gün önce", "2 ay önce").
* **📝 Not Sistemi:** Her hesap için "Smurf", "Main", "RP Var" gibi özel notlar ekleyebilirsiniz.
* **⚡ Hızlı Filtreleme:** Hesapları lig sırasına göre (Yüksekten düşüğe veya tam tersi) otomatik dizer.

### 🚀 Kurulum

1.  GitHub sayfasının sağ tarafındaki **"Releases"** kısmından en son sürümü (`.zip`) indirin.
2.  ZIP dosyasını bir klasöre çıkartın.
3.  `app.exe` (Windows) veya `app` (macOS) dosyasını çalıştırın.

### ⚙️ İlk Ayarlar (API Key)
Uygulamanın verileri çekebilmesi için kendi Riot API anahtarınızı girmelisiniz:
1.  Uygulamada sol alttaki **"⚙️ Settings"** butonuna tıklayın.
2.  [developer.riotgames.com](https://developer.riotgames.com) adresinden aldığınız **Personal API Key**'i yapıştırın ve kaydedin.
3.  Ana ekrandan "UPDATE RANKS" butonuna basarak verileri çekin.

---

## 🇬🇧 ENGLISH

### 🌟 Key Features
* **📊 Rank & LP Tracking:** Fetches instant Rank, Tier, and LP info via Riot API integration.
* **🎨 Dynamic UI:** Card borders change color automatically based on the account's rank (Gold, Diamond, Challenger, etc.).
* **📈 Winrate Analysis:** Displays seasonal winrate and total win/loss counts.
* **🟢 Activity Status:** Detects when the last match was played (e.g., "Today", "3 days ago").
* **📝 Notes System:** Add custom notes for each account to keep track of details.
* **⚡ Smart Sorting:** Automatically sorts accounts by rank (High to Low or Low to High).

### 🚀 Installation

1.  Download the latest `.zip` from the **"Releases"** section on the right.
2.  Extract the ZIP file to a folder.
3.  Run `app.exe` (Windows) or `app` (macOS).

### ⚙️ Configuration (API Key)
You need your own Riot API Key for the app to fetch data:
1.  Click the **"⚙️ Settings"** button at the bottom left.
2.  Paste your **Personal API Key** obtained from [developer.riotgames.com](https://developer.riotgames.com) and save.
3.  Click "UPDATE RANKS" on the dashboard.

---

## 🛠️ For Developers / Geliştiriciler İçin

If you want to run or modify the source code directly:

```bash
# 1. Clone the repository
git clone [https://github.com/KullaniciAdin/RepoAdin.git](https://github.com/KullaniciAdin/RepoAdin.git)

# 2. Install required dependencies
pip install customtkinter requests pillow cryptography pyinstaller

# 3. Run the app
python app.py
