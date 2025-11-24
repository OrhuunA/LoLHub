<img width="342" height="581" alt="a" src="https://github.com/user-attachments/assets/6ecf6a1b-cf6c-42c7-8b16-39a194192d14" />
<img width="439" height="521" alt="b" src="https://github.com/user-attachments/assets/620d8618-2dc9-4b4b-98c5-be9f3ad61317" />
<img width="448" height="527" alt="c" src="https://github.com/user-attachments/assets/6a4997aa-272b-4340-9f4d-1844dded6759" />
<img width="995" height="727" alt="d" src="https://github.com/user-attachments/assets/103bb63c-fd5c-45ec-b2c4-a829f5737ada" />

# League ACC Manager / LoL Rank Tracker 📊

![Python](https://img.shields.io/badge/Python-3.13-blue) ![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS-lightgrey) ![License](https://img.shields.io/badge/License-MIT-green)

**[TR]** League of Legends hesaplarınızın liglerini, LP durumlarını, kazanma oranlarını (Winrate) ve son oynama tarihlerini tek bir ekrandan takip etmenizi sağlayan, yerel ve güvenli bir masaüstü uygulamasıdır.

**[EN]** A local and secure desktop application that allows you to track the ranks, LP status, win rates, and last played dates of your League of Legends accounts from a single screen.

---

## TÜRKÇE (Turkish)

### 🌟 Özellikler
* **Rank Takibi:** Tüm hesaplarınızın güncel Lig, Aşama ve LP bilgilerini anlık çeker.
* **Detaylı İstatistikler:** Sezonluk kazanma oranı (Winrate) ve kazanılan/kaybedilen maç sayıları.
* **Aktiflik Kontrolü:** Hesabın en son ne zaman maç attığını (örn: "2 gün önce") gösterir.
* **Güvenli Saklama:** Hesap kullanıcı adı ve şifreleriniz **yerel bilgisayarınızda** özel bir anahtarla (Fernet Encryption) şifrelenerek saklanır.
* **Not Ekleme:** Her hesap için özel notlar alabilirsiniz.
* **Sıralama:** Hesapları lig sırasına göre (Yüksekten düşüğe) otomatik sıralar.

### 🚀 Kurulum ve Kullanım

1.  **İndirin:** GitHub sayfasının sağ tarafındaki **"Releases"** kısmından en son sürümü (`.zip`) indirin.
2.  **Çıkartın:** ZIP dosyasını klasöre çıkartın.
3.  **Çalıştırın:** `app.exe` (Windows) veya `app` (macOS) dosyasını çalıştırın.
4.  **API Key:** Sol alttaki **"⚙️ Settings"** butonuna tıklayın ve Riot API Key'inizi girin.

### 🔑 Riot API Key Nasıl Alınır?
Uygulamanın verileri çekebilmesi için kendi anahtarınıza ihtiyacınız vardır:
1.  [developer.riotgames.com](https://developer.riotgames.com) adresine gidin ve Riot hesabınızla giriş yapın.
2.  **"REGISTER PRODUCT"** -> **"PERSONAL API KEY"** seçeneğine tıklayın.
3.  Uygulama adı ve açıklamasını girin (Örn: "Personal Rank Tracker").
4.  Size verilen `RGAPI-...` ile başlayan kodu kopyalayıp uygulamadaki ayarlara yapıştırın.

---

## ENGLISH

### 🌟 Features
* **Rank Tracking:** Instantly fetches current Rank, Tier, and LP info for all accounts.
* **Detailed Stats:** Seasonal Winrate and Win/Loss counts.
* **Activity Check:** Shows the last time a match was played (e.g., "2 days ago").
* **Secure Storage:** Account credentials are encrypted and stored **locally on your machine** using a unique key (Fernet Encryption).
* **Notes:** Add custom notes for each account.
* **Sorting:** Automatically sorts accounts by rank (High to Low).

### 🚀 Installation & Usage

1.  **Download:** Go to the **"Releases"** section on the right side of the GitHub page and download the latest version (`.zip`).
2.  **Extract:** Extract the ZIP file to a folder.
3.  **Run:** Open `app.exe` (Windows) or `app` (macOS).
4.  **API Key:** Click the **"⚙️ Settings"** button at the bottom left and enter your Riot API Key.

### 🔑 How to Get a Riot API Key?
You need your own key for the app to fetch data:
1.  Go to [developer.riotgames.com](https://developer.riotgames.com) and log in with your Riot account.
2.  Click on **"REGISTER PRODUCT"** -> **"PERSONAL API KEY"**.
3.  Enter a product name and description (e.g., "Personal Rank Tracker").
4.  Copy the code starting with `RGAPI-...` and paste it into the app settings.

---

### 🛠️ Development (For Developers)

If you want to run the source code directly:

```bash
# Install dependencies
pip install customtkinter requests pillow cryptography

# Run the app
python app.py
