import customtkinter as ctk
import json
import os
import threading
import time
import requests
import sys
import webbrowser
import subprocess
import pyautogui
import re
import base64
import urllib.parse
import urllib3
import unicodedata
from tkinter import filedialog, messagebox
from bs4 import BeautifulSoup
from fake_useragent import UserAgent
from PIL import Image
from datetime import datetime
from cryptography.fernet import Fernet

# SSL Uyarılarını Gizle
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# --- AYARLAR ---
DATA_FILE = "accounts_db.json"
CONFIG_FILE = "config.json"
KEY_FILE = "secret.key"
CACHE_DIR = "assets/cache"

ctk.set_appearance_mode("Dark")
ctk.set_default_color_theme("blue")

RANK_ORDER = {
    "CHALLENGER": 9000, "GRANDMASTER": 8000, "MASTER": 7000,
    "DIAMOND": 6000, "EMERALD": 5000, "PLATINUM": 4000,
    "GOLD": 3000, "SILVER": 2000, "BRONZE": 1000, "IRON": 0, "UNRANKED": -1
}

RANK_COLORS = {
    "IRON": "#7a7a7a", "BRONZE": "#8c7853", "SILVER": "#d3d3d3",
    "GOLD": "#DAA520", "PLATINUM": "#00CED1", "EMERALD": "#2ecc71",
    "DIAMOND": "#b9f2ff", "MASTER": "#9b59b6", "GRANDMASTER": "#c0392b",
    "CHALLENGER": "#F1C40F", "UNRANKED": "gray"
}

def resource_path(relative_path):
    try:
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.abspath(".")
    return os.path.join(base_path, relative_path)

def get_cursor():
    if sys.platform == "darwin":
        return "pointinghand"
    else:
        return "hand2"

def ensure_cache_dir():
    if not os.path.exists(CACHE_DIR):
        os.makedirs(CACHE_DIR)

def normalize_id(riot_id):
    if not riot_id:
        return ""
    text = riot_id.strip().lower()
    turkish_map = {
        "ı": "i", "İ": "i", "ğ": "g", "Ğ": "g",
        "ü": "u", "Ü": "u", "ş": "s", "Ş": "s",
        "ö": "o", "Ö": "o", "ç": "c", "Ç": "c",
    }
    for k, v in turkish_map.items():
        text = text.replace(k, v)
    # remove combining marks (e.g. i + dot)
    text = ''.join(
        ch for ch in unicodedata.normalize("NFD", text)
        if unicodedata.category(ch) != "Mn"
    )
    text = text.replace(" ", "")
    return text

def slugify_for_url(text):
    """Türkçe karakterleri League of Graphs uyumlu hale getirir"""
    replacements = {
        "ı": "i", "İ": "i", "ğ": "g", "Ğ": "g",
        "ü": "u", "Ü": "u", "ş": "s", "Ş": "s",
        "ö": "o", "Ö": "o", "ç": "c", "Ç": "c",
        " ": "+"
    }
    for search, replace in replacements.items():
        text = text.replace(search, replace)
    return text

ensure_cache_dir()

# --------------------------

class CipherManager:
    def __init__(self):
        self.key = self.load_key()
        self.cipher = Fernet(self.key)

    def load_key(self):
        if os.path.exists(KEY_FILE):
            with open(KEY_FILE, "rb") as f:
                return f.read()
        else:
            key = Fernet.generate_key()
            with open(KEY_FILE, "wb") as f:
                f.write(key)
            return key

    def encrypt(self, text):
        return self.cipher.encrypt(text.encode()).decode()

    def decrypt(self, encrypted_text):
        try:
            return self.cipher.decrypt(encrypted_text.encode()).decode()
        except:
            return encrypted_text

cipher_man = CipherManager()

# --- LCU Handler ---
class LCUHandler:
    def __init__(self):
        self.port = None
        self.password = None
        self.protocol = "https"
        self.connected = False
        self.headers = {}

    def try_connect(self):
        possible_paths = []
        if sys.platform == "darwin":
            possible_paths = [
                "/Applications/League of Legends.app/Contents/LoL/lockfile",
                "/Applications/Riot Games/League of Legends.app/Contents/LoL/lockfile"
            ]
        else:
            possible_paths = [
                "C:\\Riot Games\\League of Legends\\lockfile",
                "D:\\Riot Games\\League of Legends\\lockfile"
            ]

        lockfile_path = None
        for p in possible_paths:
            if os.path.exists(p):
                lockfile_path = p
                break

        if not lockfile_path:
            return False

        try:
            with open(lockfile_path, 'r') as f:
                data = f.read().split(':')
                self.port = data[2]
                self.password = data[3]
                self.protocol = data[4]

                auth_str = f"riot:{self.password}"
                auth_b64 = base64.b64encode(auth_str.encode()).decode()
                self.headers = {
                    "Authorization": f"Basic {auth_b64}",
                    "Accept": "application/json"
                }
                self.connected = True
                return True
        except:
            self.connected = False
            return False

    def request(self, method, endpoint, data=None):
        if not self.connected:
            return None
        url = f"{self.protocol}://127.0.0.1:{self.port}{endpoint}"
        try:
            if method == "GET":
                return requests.get(url, headers=self.headers, verify=False)
            elif method == "POST":
                return requests.post(url, headers=self.headers, json=data, verify=False)
            elif method == "PATCH":
                return requests.patch(url, headers=self.headers, json=data, verify=False)
        except Exception:
            self.connected = False
            return None

lcu_handler = LCUHandler()

# --- GAME TOOLS WINDOW ---
class GameToolsWindow(ctk.CTkToplevel):
    def __init__(self, parent):
        super().__init__(parent)
        self.title("Game Tools")
        self.geometry("500x600")
        self.resizable(False, False)
        self.attributes("-topmost", True)
        self.my_parent = parent

        self.main_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.main_frame.pack(fill="both", expand=True, padx=20, pady=20)

        title_frame = ctk.CTkFrame(self.main_frame, fg_color="transparent")
        title_frame.pack(fill="x", pady=(0, 20))
        ctk.CTkLabel(title_frame, text="GAME AUTOMATION", font=("Arial", 20, "bold"), text_color="white").pack(side="left")

        self.status_lbl = ctk.CTkLabel(title_frame, text="● LCU: Connecting...", text_color="gray", font=("Arial", 12))
        self.status_lbl.pack(side="right")
        self.update_lcu_status()

        acc_frame = ctk.CTkFrame(self.main_frame, fg_color="#2b2b2b", border_width=1, border_color="#404040")
        acc_frame.pack(fill="x", pady=(0, 15))
        ctk.CTkLabel(acc_frame, text="AUTO ACCEPT", font=("Arial", 14, "bold")).pack(side="left", padx=15, pady=15)
        self.switch_accept = ctk.CTkSwitch(
            acc_frame,
            text="Active",
            variable=self.my_parent.auto_accept_var,
            command=self.my_parent.save_config,
            onvalue=True,
            offvalue=False,
            progress_color="#2ecc71"
        )
        self.switch_accept.pack(side="right", padx=15)

        pick_frame = ctk.CTkFrame(self.main_frame, fg_color="#2b2b2b", border_width=1, border_color="#404040")
        pick_frame.pack(fill="both", expand=True)
        head_frame = ctk.CTkFrame(pick_frame, fg_color="transparent")
        head_frame.pack(fill="x", padx=15, pady=15)
        ctk.CTkLabel(head_frame, text="AUTO PICK / BAN", font=("Arial", 14, "bold")).pack(side="left")

        toggle_frame = ctk.CTkFrame(head_frame, fg_color="transparent")
        toggle_frame.pack(side="right")
        self.switch_pick = ctk.CTkSwitch(
            toggle_frame,
            text="Pick",
            variable=self.my_parent.auto_pick_var,
            command=self.my_parent.save_config,
            onvalue=True,
            offvalue=False,
            progress_color="#2ecc71"
        )
        self.switch_pick.pack(side="left", padx=5)
        self.switch_ban = ctk.CTkSwitch(
            toggle_frame,
            text="Ban",
            variable=self.my_parent.auto_ban_var,
            command=self.my_parent.save_config,
            onvalue=True,
            offvalue=False,
            progress_color="#e67e22"
        )
        self.switch_ban.pack(side="left", padx=5)

        self.selection_target = ctk.StringVar(value="pick")
        mode_frame = ctk.CTkFrame(pick_frame, fg_color="transparent")
        mode_frame.pack(fill="x", padx=15)
        self.btn_mode_pick = ctk.CTkButton(
            mode_frame, text="Set Pick Target", width=130, height=28,
            fg_color="#2ecc71", hover_color="#27ae60",
            command=lambda: self.set_mode("pick")
        )
        self.btn_mode_pick.pack(side="left", padx=5, pady=(0, 10))
        self.btn_mode_ban = ctk.CTkButton(
            mode_frame, text="Set Ban Target", width=130, height=28,
            fg_color="#e67e22", hover_color="#d35400",
            command=lambda: self.set_mode("ban")
        )
        self.btn_mode_ban.pack(side="left", padx=5, pady=(0, 10))

        self.lbl_selected = ctk.CTkLabel(
            pick_frame,
            text=f"Pick: {self.my_parent.target_champ_name}   |   Ban: {self.my_parent.target_ban_name}",
            font=("Arial", 13),
            text_color="#3498db"
        )
        self.lbl_selected.pack(pady=(0, 10))

        self.search_var = ctk.StringVar()
        self.search_var.trace("w", self.filter_champions)
        self.entry_search = ctk.CTkEntry(
            pick_frame,
            placeholder_text="🔍 Search Champion...",
            textvariable=self.search_var,
            height=35
        )
        self.entry_search.pack(fill="x", padx=15, pady=(0, 10))

        self.scroll_area = ctk.CTkScrollableFrame(pick_frame, fg_color="transparent")
        self.scroll_area.pack(fill="both", expand=True, padx=5, pady=5)

        self.champ_buttons = {}
        self.create_champ_buttons()

    def update_lcu_status(self):
        if not self.winfo_exists():
            return
        if lcu_handler.connected:
            self.status_lbl.configure(text="● LCU: Connected", text_color="#2ecc71")
        else:
            self.status_lbl.configure(text="● LCU: Disconnected", text_color="#e74c3c")
        self.after(2000, self.update_lcu_status)

    def create_champ_buttons(self):
        sorted_champs = sorted(self.my_parent.champions_map.keys())
        for i, name in enumerate(sorted_champs):
            btn = ctk.CTkButton(
                self.scroll_area,
                text=name,
                height=32,
                fg_color="#333",
                hover_color="#444",
                command=lambda n=name: self.select_champion(n)
            )
            btn.grid(row=i // 3, column=i % 3, padx=3, pady=3, sticky="ew")
            self.champ_buttons[name] = btn
        self.scroll_area.grid_columnconfigure(0, weight=1)
        self.scroll_area.grid_columnconfigure(1, weight=1)
        self.scroll_area.grid_columnconfigure(2, weight=1)

    def filter_champions(self, *args):
        query = self.search_var.get().lower()
        visible_idx = 0
        for name, btn in self.champ_buttons.items():
            if query in name.lower():
                btn.grid(row=visible_idx // 3, column=visible_idx % 3, padx=3, pady=3, sticky="ew")
                visible_idx += 1
            else:
                btn.grid_forget()

    def set_mode(self, mode):
        self.selection_target.set(mode)
        if mode == "pick":
            self.btn_mode_pick.configure(fg_color="#2ecc71", text_color="black")
            self.btn_mode_ban.configure(fg_color="#3b3b3b", text_color="white")
        else:
            self.btn_mode_pick.configure(fg_color="#3b3b3b", text_color="white")
            self.btn_mode_ban.configure(fg_color="#e67e22", text_color="black")

    def select_champion(self, name):
        champ_id = self.my_parent.champions_map[name]
        if self.selection_target.get() == "ban":
            self.my_parent.target_ban_name = name
            self.my_parent.target_ban_id = champ_id
        else:
            self.my_parent.target_champ_name = name
            self.my_parent.target_champ_id = champ_id
        self.my_parent.save_config()
        self.lbl_selected.configure(
            text=f"Pick: {self.my_parent.target_champ_name}   |   Ban: {self.my_parent.target_ban_name}"
        )
        self.update_champ_buttons()

    def update_champ_buttons(self):
        for n, btn in self.champ_buttons.items():
            if n == self.my_parent.target_champ_name:
                btn.configure(fg_color="#2ecc71", hover_color="#27ae60", text_color="black")
            elif n == self.my_parent.target_ban_name:
                btn.configure(fg_color="#e67e22", hover_color="#d35400", text_color="black")
            else:
                btn.configure(fg_color="#333", hover_color="#444", text_color="white")

# --- BULK CHECK WINDOW ---
class BulkCheckWindow(ctk.CTkToplevel):
    def __init__(self, parent):
        super().__init__(parent)
        self.title("Bulk Account Check")
        self.geometry("400x500")
        self.resizable(False, False)
        self.attributes("-topmost", True)
        self.my_parent = parent

        ctk.CTkLabel(self, text="BULK CHECKER", font=("Arial", 18, "bold"), text_color="white").pack(pady=15)

        self.log_area = ctk.CTkTextbox(self, width=360, height=350)
        self.log_area.pack(pady=5)
        self.log_area.configure(state="disabled")

        self.progress = ctk.CTkProgressBar(self, width=360)
        self.progress.pack(pady=10)
        self.progress.set(0)

        self.status_lbl = ctk.CTkLabel(self, text="Ready to start...", text_color="gray")
        self.status_lbl.pack(pady=5)

        self.start_process()

    def log(self, text):
        if not self.winfo_exists():
            return
        self.log_area.configure(state="normal")
        self.log_area.insert("end", text + "\n")
        self.log_area.see("end")
        self.log_area.configure(state="disabled")

    def start_process(self):
        threading.Thread(target=self.run_bulk_check).start()

    def run_bulk_check(self):
        accounts = self.my_parent.accounts
        total = len(accounts)
        self.log(f"Starting check for {total} accounts...")

        for i, acc in enumerate(accounts):
            if not self.winfo_exists():
                break

            riot_id = acc.get('riot_id', 'Unknown')
            self.status_lbl.configure(text=f"Checking: {riot_id}")
            self.log(f"[{i+1}/{total}] Checking {riot_id}...")

            try:
                scraped_data = self.my_parent.fetch_rank_without_api(acc['server'], riot_id)
                if scraped_data:
                    acc.update(scraped_data)
                    self.log(f"   -> Found: {scraped_data.get('rank_tier')} {scraped_data.get('rank_div')}")
                else:
                    self.log("   -> No data or Unranked")
            except Exception as e:
                self.log(f"   -> Error: {e}")

            self.progress.set((i + 1) / total)
            time.sleep(1.2)

        self.my_parent.save_data()
        self.my_parent.filter_accounts(None)
        if self.winfo_exists():
            self.status_lbl.configure(text="Completed!", text_color="#2ecc71")
            self.log("--- ALL DONE ---")
            self.after(3000, self.destroy)

# --- SETTINGS WINDOW ---
class SettingsWindow(ctk.CTkToplevel):
    def __init__(self, parent):
        super().__init__(parent)
        self.title("Settings")
        self.geometry("450x400")
        self.resizable(False, False)
        self.attributes("-topmost", True)
        self.my_parent = parent

        ctk.CTkLabel(self, text="SETTINGS", font=("Arial", 18, "bold"), text_color="white").pack(pady=(20, 10))

        ctk.CTkLabel(self, text="Riot Client Path:", font=("Arial", 12), text_color="gray").pack(pady=(5, 0))
        path_frame = ctk.CTkFrame(self, fg_color="transparent")
        path_frame.pack(pady=5)
        self.entry_path = ctk.CTkEntry(path_frame, width=260, height=35)
        if self.my_parent.riot_client_path:
            self.entry_path.insert(0, self.my_parent.riot_client_path)
        self.entry_path.pack(side="left", padx=(0, 5))
        ctk.CTkButton(path_frame, text="📂", width=40, height=35, command=self.browse_file).pack(side="left")

        ctk.CTkFrame(self, height=2, width=300, fg_color="#444").pack(pady=15)
        ctk.CTkLabel(self, text="BACKUP & RESTORE", font=("Arial", 12, "bold"), text_color="gray").pack(pady=5)

        backup_frame = ctk.CTkFrame(self, fg_color="transparent")
        backup_frame.pack(pady=5)
        ctk.CTkButton(
            backup_frame,
            text="⬇️ Export Data",
            width=140,
            fg_color="#2980b9",
            command=self.export_data
        ).pack(side="left", padx=10)
        ctk.CTkButton(
            backup_frame,
            text="⬆️ Import Data",
            width=140,
            fg_color="#27ae60",
            command=self.import_data
        ).pack(side="left", padx=10)

        ctk.CTkButton(
            self,
            text="SAVE & CLOSE",
            width=200,
            height=40,
            fg_color="#2ea44f",
            hover_color="#22863a",
            command=self.save_settings
        ).pack(pady=20)

    def browse_file(self):
        filetypes = [("Executables", "*.exe"), ("Applications", "*.app"), ("All Files", "*.*")]
        if sys.platform == "darwin":
            filetypes = [("Applications", "*.app"), ("All Files", "*.*")]
        filename = filedialog.askopenfilename(filetypes=filetypes)
        if filename:
            self.entry_path.delete(0, "end")
            self.entry_path.insert(0, filename)

    def export_data(self):
        try:
            filename = filedialog.asksaveasfilename(
                defaultextension=".json",
                filetypes=[("JSON Files", "*.json")],
                initialfile="lol_accounts_backup.json"
            )
            if filename:
                with open(filename, 'w') as f:
                    json.dump(self.my_parent.accounts, f, indent=4)
                messagebox.showinfo("Success", "Data exported successfully!")
        except Exception as e:
            messagebox.showerror("Error", str(e))

    def import_data(self):
        try:
            filename = filedialog.askopenfilename(filetypes=[("JSON Files", "*.json")])
            if filename:
                with open(filename, 'r') as f:
                    new_data = json.load(f)
                if isinstance(new_data, list) and len(new_data) > 0 and 'login_id' in new_data[0]:
                    self.my_parent.accounts = new_data
                    self.my_parent.save_data()
                    self.my_parent.filter_accounts(None)
                    messagebox.showinfo("Success", f"{len(new_data)} accounts imported successfully!")
                else:
                    messagebox.showerror("Error", "Invalid backup file format.")
        except Exception as e:
            messagebox.showerror("Error", str(e))

    def save_settings(self):
        self.my_parent.riot_client_path = self.entry_path.get().strip()
        self.my_parent.save_config()
        self.destroy()

# --- EDIT & ADD WINDOWS ---
class EditAccountWindow(ctk.CTkToplevel):
    def __init__(self, parent, acc):
        super().__init__(parent)
        self.title("Edit")
        self.geometry("350x550")
        self.resizable(False, False)
        self.attributes("-topmost", True)
        self.my_parent = parent
        self.acc = acc
        ctk.CTkLabel(self, text="EDIT ACCOUNT", font=("Arial", 18, "bold"), text_color="white").pack(pady=(20, 10))
        self.entry_user = ctk.CTkEntry(self, width=220, height=35)
        self.entry_user.insert(0, acc['login_id'])
        self.entry_user.pack(pady=5)
        self.entry_pass = ctk.CTkEntry(self, width=220, height=35)
        self.entry_pass.insert(0, acc['login_pw'])
        self.entry_pass.pack(pady=5)
        ctk.CTkLabel(self, text="Riot ID", font=("Arial", 11), text_color="gray").pack(pady=(10, 0))
        self.entry_riot = ctk.CTkEntry(self, width=220, height=35)
        self.entry_riot.insert(0, acc['riot_id'])
        self.entry_riot.pack(pady=5)
        ctk.CTkLabel(self, text="Notes", font=("Arial", 11), text_color="gray").pack(pady=(10, 0))
        self.entry_note = ctk.CTkTextbox(self, width=220, height=80)
        self.entry_note.insert("0.0", acc.get('note', ''))
        self.entry_note.pack(pady=5)
        self.save_btn = ctk.CTkButton(
            self,
            text="UPDATE",
            width=220,
            height=40,
            fg_color="#2ea44f",
            hover_color="#22863a",
            command=self.save_changes
        )
        self.save_btn.pack(pady=20)

    def save_changes(self):
        self.acc['login_id'] = self.entry_user.get().strip()
        self.acc['login_pw'] = self.entry_pass.get().strip()
        self.acc['riot_id'] = self.entry_riot.get().strip()
        self.acc['note'] = self.entry_note.get("0.0", "end").strip()
        self.my_parent.save_data()
        self.my_parent.filter_accounts(None)
        self.destroy()

class AddAccountWindow(ctk.CTkToplevel):
    def __init__(self, parent):
        super().__init__(parent)
        self.title("New")
        self.geometry("350x550")
        self.resizable(False, False)
        self.attributes("-topmost", True)
        self.my_parent = parent
        ctk.CTkLabel(self, text="NEW ACCOUNT", font=("Arial", 18, "bold"), text_color="white").pack(pady=(20, 10))
        self.entry_user = ctk.CTkEntry(self, placeholder_text="Username", width=220, height=35)
        self.entry_user.pack(pady=5)
        self.entry_pass = ctk.CTkEntry(self, placeholder_text="Password", show="*", width=220, height=35)
        self.entry_pass.pack(pady=5)
        ctk.CTkLabel(self, text="Riot ID", font=("Arial", 11), text_color="gray").pack(pady=(10, 0))
        self.entry_riot = ctk.CTkEntry(self, placeholder_text="e.g. Faker#T1", width=220, height=35)
        self.entry_riot.pack(pady=5)
        ctk.CTkLabel(self, text="Format: Name#Tag (No spaces)", font=("Arial", 10), text_color="gray").pack(pady=(0, 5))
        ctk.CTkLabel(self, text="Notes (Optional)", font=("Arial", 11), text_color="gray").pack(pady=(5, 0))
        self.entry_note = ctk.CTkTextbox(self, width=220, height=80)
        self.entry_note.pack(pady=5)
        self.save_btn = ctk.CTkButton(
            self,
            text="SAVE",
            width=220,
            height=40,
            fg_color="#2ea44f",
            hover_color="#22863a",
            font=("Arial", 13, "bold"),
            command=self.save_action
        )
        self.save_btn.pack(pady=20)

    def save_action(self):
        u_id = self.entry_user.get()
        u_pw = self.entry_pass.get()
        r_id = self.entry_riot.get()
        if not u_id or not u_pw or not r_id:
            return
        new_acc = {
            "login_id": u_id.strip(),
            "login_pw": u_pw.strip(),
            "riot_id": r_id.strip(),
            "server": self.my_parent.server_var.get(),
            "rank_tier": "UNRANKED",
            "rank_div": "",
            "lp": 0,
            "note": self.entry_note.get("0.0", "end").strip(),
            "last_seen": "Unknown"
        }
        self.my_parent.add_account_to_db(new_acc)
        self.destroy()

# --- DETAILS WINDOW ---
class AccountDetailsWindow(ctk.CTkToplevel):
    def __init__(self, parent, acc):
        super().__init__(parent)
        self.title(f"Details - {acc['riot_id']}")
        self.geometry("450x480")
        self.resizable(False, False)
        self.attributes("-topmost", True)
        self.my_parent = parent
        self.acc = acc
        self.active = True
        self.protocol("WM_DELETE_WINDOW", self.on_close)

        ctk.CTkLabel(self, text=acc['riot_id'], font=("Arial", 24, "bold"), text_color="white").pack(pady=(20, 5))
        last_seen = acc.get('last_seen', 'Unknown')
        ctk.CTkLabel(self, text=f"Last Played: {last_seen}", font=("Arial", 12), text_color="gray").pack(pady=(0, 20))

        info_frame = ctk.CTkFrame(self, fg_color="transparent")
        info_frame.pack(fill="x", padx=20)

        self.create_info_row(info_frame, "User Name:", acc['login_id'])
        self.create_info_row(info_frame, "Password:", acc['login_pw'])

        # --- YENİ BİLGİ SATIRI (Canlı Güncellenen) ---
        stats_frame = ctk.CTkFrame(self, fg_color="#2b2b2b", border_width=1, border_color="#444")
        stats_frame.pack(fill="x", padx=20, pady=15)

        # Yenile Butonu
        self.btn_refresh = ctk.CTkButton(
            stats_frame,
            text="⟳",
            width=30,
            height=25,
            fg_color="#333",
            hover_color="#555",
            command=self.refresh_click
        )
        self.btn_refresh.pack(side="right", padx=10, pady=8)

        self.lbl_stats = ctk.CTkLabel(
            stats_frame,
            text="Loading stats...",
            font=("Arial", 13, "bold"),
            text_color="#f1c40f"
        )
        self.lbl_stats.pack(side="left", padx=15, pady=8)
        self.update_stats_ui()
        # İlk açılışta aktif LCU hesabından çekmeye çalış
        threading.Thread(target=self.my_parent.fetch_and_save_stats, daemon=True).start()
        # -------------------------------------------

        if acc.get('note'):
            ctk.CTkLabel(self, text="NOTES", font=("Arial", 12, "bold"), text_color="gray").pack(pady=(10, 5))
            note_frame = ctk.CTkFrame(self, fg_color="#333", corner_radius=6)
            note_frame.pack(fill="x", padx=20)
            ctk.CTkLabel(
                note_frame,
                text=acc['note'],
                wraplength=350,
                font=("Arial", 13),
                text_color="#ddd",
                justify="left"
            ).pack(padx=10, pady=10)

        ctk.CTkFrame(self, height=1, width=280, fg_color="#333").pack(pady=20)

        login_btn = ctk.CTkButton(
            self,
            text="🚀 AUTO LOGIN",
            height=40,
            fg_color="#0984e3",
            hover_color="#00cec9",
            font=("Arial", 14, "bold")
        )
        login_btn.configure(command=lambda: self.my_parent.start_auto_login(self.acc))
        login_btn.pack(pady=(0, 10))

        log_btn = ctk.CTkButton(
            self,
            text="🌐 LEAGUE OF GRAPHS",
            height=35,
            fg_color="#2c3e50",
            hover_color="#34495e",
            font=("Arial", 12, "bold")
        )
        log_btn.configure(command=lambda: self.my_parent.open_log_profile(self.acc))
        log_btn.pack(pady=(0, 20))

        action_frame = ctk.CTkFrame(self, fg_color="transparent")
        action_frame.pack(pady=5)

        edit_icon = self.my_parent.icons.get('edit')
        btn_edit = ctk.CTkButton(
            action_frame,
            text="Edit",
            image=edit_icon,
            width=32,
            height=32,
            fg_color="#d98e04",
            hover_color="#b57602",
            command=self.open_edit
        )
        if edit_icon:
            btn_edit.configure(text="")
            btn_edit.image = edit_icon
        btn_edit.pack(side="left", padx=8)

        delete_icon = self.my_parent.icons.get('delete')
        btn_delete = ctk.CTkButton(
            action_frame,
            text="Del",
            image=delete_icon,
            width=32,
            height=32,
            fg_color="#801818",
            hover_color="red",
            command=self.delete_this_account
        )
        if delete_icon:
            btn_delete.configure(text="")
            btn_delete.image = delete_icon
        btn_delete.pack(side="left", padx=8)

    def on_close(self):
        self.active = False
        self.destroy()

    def refresh_click(self):
        self.lbl_stats.configure(text="Updating...", text_color="gray")
        self.my_parent.fetch_and_save_stats()
        self.update_stats_ui()

    def update_stats_ui(self):
        if not self.active or not self.winfo_exists():
            return

        skins = self.acc.get('skin_count', 'N/A')
        be = self.acc.get('blue_essence', 'N/A')
        rp = self.acc.get('rp', 'N/A')
        level = self.acc.get('level', 'N/A')

        level_color = "#e67e22" if isinstance(level, int) and level < 30 else "#2ecc71"

        text = f"Lvl: {level}   |   Skins: {skins}   |   BE: {be}   |   RP: {rp}"
        self.lbl_stats.configure(text=text, text_color=level_color)

        self.after(2000, self.update_stats_ui)

    def create_info_row(self, parent_frame, label_text, value_text):
        row = ctk.CTkFrame(parent_frame, fg_color="transparent")
        row.pack(fill="x", pady=6)
        ctk.CTkLabel(
            row,
            text=label_text,
            width=85,
            anchor="w",
            text_color="gray",
            font=("Arial", 13)
        ).pack(side="left")
        entry_val = ctk.CTkEntry(row, width=140, height=28, show="*", font=("Arial", 14))
        entry_val.insert(0, value_text)
        entry_val.configure(state="readonly")
        entry_val.pack(side="left", padx=5)

        copy_icon = self.my_parent.icons.get('copy')
        btn_copy = ctk.CTkButton(
            row,
            text="C",
            image=copy_icon,
            width=25,
            height=25,
            fg_color="#333",
            hover_color="#555"
        )
        if copy_icon:
            btn_copy.configure(text="")
            btn_copy.image = copy_icon
        btn_copy.configure(command=lambda b=btn_copy, t=value_text: self.my_parent.copy_to_clipboard(t, b))
        btn_copy.pack(side="right")

        show_icon = self.my_parent.icons.get('show')
        btn_reveal = ctk.CTkButton(
            row,
            text="S",
            image=show_icon,
            width=25,
            height=25,
            fg_color="#333",
            hover_color="#555"
        )
        if show_icon:
            btn_reveal.configure(text="")
            btn_reveal.image = show_icon
        btn_reveal.configure(command=lambda e=entry_val, b=btn_reveal: self.toggle_reveal(e, b))
        btn_reveal.pack(side="right", padx=(0, 4))

    def toggle_reveal(self, entry_widget, btn_widget):
        hide_icon = self.my_parent.icons.get('hide')
        show_icon = self.my_parent.icons.get('show')
        if entry_widget.cget("show") == "*":
            entry_widget.configure(show="")
            if hide_icon:
                btn_widget.configure(image=hide_icon)
                btn_widget.image = hide_icon
        else:
            entry_widget.configure(show="*")
            if show_icon:
                btn_widget.configure(image=show_icon)
                btn_widget.image = show_icon

    def open_edit(self):
        self.on_close()
        EditAccountWindow(self.my_parent, self.acc)

    def delete_this_account(self):
        self.my_parent.delete_account(self.acc)
        self.on_close()

# --- MAIN APP ---
class LolManagerApp(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title("League ACC Manager v13.0 (Level Up)")
        self.geometry("1000x700")

        self.api_key = ""  # API Key kullanılmıyor
        self.riot_client_path = ""
        self.auto_accept_var = ctk.BooleanVar(value=False)
        self.auto_pick_var = ctk.BooleanVar(value=False)
        self.auto_ban_var = ctk.BooleanVar(value=False)
        self.target_champ_id = 0
        self.target_champ_name = "None"
        self.target_ban_id = 0
        self.target_ban_name = "None"

        self.last_stats_update = 0

        # --- PENCERE TAKİBİ ---
        self.w_settings = None
        self.w_gametools = None
        self.w_bulk = None
        self.w_add = None
        self.w_details = None
        self.last_details_acc = None
        # ----------------------

        self.champions_map = self.get_champions()
        self.load_settings()

        self.protocol("WM_DELETE_WINDOW", self.force_exit)

        self.accounts = self.load_data()
        self.sort_descending = True

        self.load_icons()
        self.load_rank_images()

        self.sidebar = ctk.CTkFrame(self, width=220, corner_radius=0)
        self.sidebar.pack(side="left", fill="y")

        ctk.CTkLabel(
            self.sidebar,
            text="League ACC\nManager",
            font=ctk.CTkFont(size=22, weight="bold")
        ).pack(padx=20, pady=(30, 10))

        ctk.CTkLabel(self.sidebar, text="Server:", text_color="gray").pack(padx=20, pady=(10, 5))
        self.server_var = ctk.StringVar(value="EUW1")
        self.server_menu = ctk.CTkOptionMenu(
            self.sidebar,
            variable=self.server_var,
            values=["TR1", "EUW1", "EUN1", "NA1"],
            command=self.filter_accounts,
            width=180
        )
        self.server_menu.pack(padx=20, pady=5)

        self.search_var = ctk.StringVar()
        self.search_var.trace("w", self.filter_accounts)
        self.entry_search = ctk.CTkEntry(
            self.sidebar,
            placeholder_text="🔍 Search (Name, Rank, Note)",
            textvariable=self.search_var,
            width=180
        )
        self.entry_search.pack(padx=20, pady=(10, 5))

        self.sort_btn = ctk.CTkButton(
            self.sidebar,
            text="⬇️ Rank: High to Low",
            command=self.toggle_sort,
            fg_color="#444",
            hover_color="#555",
            width=180
        )
        self.sort_btn.pack(padx=20, pady=10)

        ctk.CTkFrame(self.sidebar, height=2, fg_color="gray").pack(fill="x", padx=20, pady=10)

        self.add_btn = ctk.CTkButton(
            self.sidebar,
            text="+ ADD ACCOUNT",
            command=self.open_add_window,
            fg_color="#2ea44f",
            hover_color="#22863a",
            height=40,
            font=("Arial", 13, "bold")
        )
        self.add_btn.pack(padx=20, pady=(10, 10))

        self.refresh_btn = ctk.CTkButton(
            self.sidebar,
            text="UPDATE RANKS",
            command=self.update_ranks_from_api,
            fg_color="#0366d6",
            hover_color="#0256b4",
            height=40,
            font=("Arial", 13, "bold")
        )
        self.refresh_btn.pack(padx=20, pady=10)

        self.bulk_btn = ctk.CTkButton(
            self.sidebar,
            text="♻️ BULK CHECK",
            command=self.open_bulk_check,
            fg_color="#e67e22",
            hover_color="#d35400",
            height=35,
            font=("Arial", 12, "bold")
        )
        self.bulk_btn.pack(padx=20, pady=(15, 5))

        self.tools_btn = ctk.CTkButton(
            self.sidebar,
            text="🎮 GAME TOOLS",
            command=self.open_game_tools,
            fg_color="#8e44ad",
            hover_color="#9b59b6",
            height=35,
            font=("Arial", 12, "bold")
        )
        self.tools_btn.pack(padx=20, pady=5)

        self.settings_btn = ctk.CTkButton(
            self.sidebar,
            text="⚙️ Settings",
            command=self.open_settings,
            fg_color="transparent",
            border_width=1,
            border_color="gray",
            text_color="gray"
        )
        self.settings_btn.pack(side="bottom", pady=20, padx=20)

        self.exit_btn = ctk.CTkButton(
            self.sidebar,
            text="EXIT APP",
            command=self.force_exit,
            fg_color="transparent",
            text_color="#e74c3c",
            font=("Arial", 11, "bold"),
            hover_color="#2b2b2b"
        )
        self.exit_btn.pack(side="bottom", pady=(0, 10))

        self.main_area = ctk.CTkScrollableFrame(self, label_text="Accounts List")
        self.main_area.pack(side="right", fill="both", expand=True, padx=15, pady=15)

        self.filter_accounts(None)

        self.running = True
        threading.Thread(target=self.background_loop, daemon=True).start()

    def load_settings(self):
        if os.path.exists(CONFIG_FILE):
            try:
                with open(CONFIG_FILE, "r") as f:
                    data = json.load(f)
                    self.api_key = data.get("api_key", "")
                    self.riot_client_path = data.get("riot_path", "")
                    self.auto_accept_var.set(data.get("auto_accept", False))
                    self.auto_pick_var.set(data.get("auto_pick", False))
                    self.auto_ban_var.set(data.get("auto_ban", False))
                    self.target_champ_id = data.get("pick_champ_id", 0)
                    self.target_champ_name = data.get("pick_champ_name", "None")
                    self.target_ban_id = data.get("ban_champ_id", 0)
                    self.target_ban_name = data.get("ban_champ_name", "None")
            except:
                pass

    def save_config(self):
        data = {
            "api_key": self.api_key,
            "riot_path": self.riot_client_path,
            "auto_accept": self.auto_accept_var.get(),
            "auto_pick": self.auto_pick_var.get(),
            "auto_ban": self.auto_ban_var.get(),
            "pick_champ_id": self.target_champ_id,
            "pick_champ_name": self.target_champ_name,
            "ban_champ_id": self.target_ban_id,
            "ban_champ_name": self.target_ban_name
        }
        with open(CONFIG_FILE, "w") as f:
            json.dump(data, f, indent=4)

    def force_exit(self):
        self.running = False
        self.destroy()
        sys.exit()

    def get_champions(self):
        try:
            ver = requests.get("https://ddragon.leagueoflegends.com/api/versions.json").json()[0]
            data = requests.get(
                f"https://ddragon.leagueoflegends.com/cdn/{ver}/data/en_US/champion.json"
            ).json()
            champs = {}
            for k, v in data['data'].items():
                champs[v['name']] = int(v['key'])
            return champs
        except:
            return {"Yasuo": 157, "Yone": 777}

    def open_game_tools(self):
        if self.w_gametools is None or not self.w_gametools.winfo_exists():
            self.w_gametools = GameToolsWindow(self)
        else:
            self.w_gametools.focus()

    def open_bulk_check(self):
        if self.w_bulk is None or not self.w_bulk.winfo_exists():
            self.w_bulk = BulkCheckWindow(self)
        else:
            self.w_bulk.focus()

    def open_settings(self):
        if self.w_settings is None or not self.w_settings.winfo_exists():
            self.w_settings = SettingsWindow(self)
        else:
            self.w_settings.focus()

    def open_add_window(self):
        if self.w_add is None or not self.w_add.winfo_exists():
            self.w_add = AddAccountWindow(self)
        else:
            self.w_add.focus()

    def open_details_window(self, acc):
        if self.w_details is not None and self.w_details.winfo_exists():
            self.w_details.on_close()
        self.w_details = AccountDetailsWindow(self, acc)
        self.last_details_acc = acc

    def open_log_profile(self, acc):
        """League of Graphs profiline doğrudan git"""
        riot_id = acc.get("riot_id", "")
        if "#" not in riot_id:
            return

        name, tag = riot_id.split("#", 1)

        region_map = {"TR1": "tr", "EUW1": "euw", "EUN1": "eune", "NA1": "na"}
        region = region_map.get(acc.get("server", "TR1"), "tr")

        # "Name-Tag" yapıp URL encode et
        slug = urllib.parse.quote(f"{name}-{tag}", safe="")
        url = f"https://www.leagueofgraphs.com/summoner/{region}/{slug}"
        webbrowser.open(url)
    def fetch_and_save_stats(self):
        try:
            # Lockfile değişmiş olabilir; birkaç kez yeniden dene
            r = None
            for _ in range(5):
                lcu_handler.try_connect()
                if not lcu_handler.connected:
                    time.sleep(1)
                    continue
                r = lcu_handler.request("GET", "/lol-summoner/v1/current-summoner")
                if r and r.status_code == 200:
                    break
                time.sleep(1)

            if not r or r.status_code != 200:
                print("STATS current-summoner failed", r.status_code if r else "no response")
                return

            data = r.json()
            current_riot_id = f"{data.get('gameName')}#{data.get('tagLine')}"
            current_level = data.get('summonerLevel', 0)

            # 2) DB'de bu hesabı bul
            current_clean = normalize_id(current_riot_id)
            target_acc = None
            for acc in self.accounts:
                if normalize_id(acc['riot_id']) == current_clean:
                    target_acc = acc
                    break

            # Eğer eşleşme yoksa, aktif detay penceresindeki hesabı bu Riot ID ile eşleştir
            if not target_acc and self.w_details and self.w_details.winfo_exists():
                candidate = self.w_details.acc
                target_acc = candidate
                target_acc['riot_id'] = current_riot_id

            if not target_acc:
                # print("STATS: matching account not found in db for", current_riot_id)
                return

            def to_int(v):
                if isinstance(v, (int, float)):
                    return int(v)
                if isinstance(v, str):
                    m = re.search(r"\d+", v)
                    return int(m.group(0)) if m else 0
                return 0

            # Eski değerleri yedekle (None ise 0'a çek)
            old_be = to_int(target_acc.get('blue_essence', 0) or 0)
            old_rp = to_int(target_acc.get('rp', 0) or 0)

            # Level her zaman güncellenebilir, bunda problem yok
            target_acc['level'] = current_level

            be = 0
            rp = 0

            # 3) BLUE ESSENCE -> /lol-store/v1/wallet
            store_wallet = lcu_handler.request("GET", "/lol-store/v1/wallet")
            if store_wallet and store_wallet.status_code == 200:
                w = store_wallet.json()

                def pick_first(data, keys):
                    if not isinstance(data, dict):
                        return None
                    for k in keys:
                        if k in data and data[k] is not None:
                            return data[k]
                    return None

                be_raw = pick_first(
                    w,
                    ["ip", "blueEssence", "be", "BE", "blue_essence", "lol_blue_essence"]
                )
                rp_raw_store = pick_first(
                    w,
                    ["rp", "RP", "lol_rp"]
                )

                if be_raw is not None:
                    be = to_int(be_raw)
                if rp_raw_store is not None:
                    rp = to_int(rp_raw_store)
            else:
                print("STATS store wallet status", store_wallet.status_code if store_wallet else "no response")

            # 3-b) BLUE ESSENCE fallback -> /lol-inventory/v1/wallet?currencyTypes=["BLUE_ESSENCE"]
            # Bazı istemciler BE'yi store wallet'ta döndürmüyor, bu yüzden inventory üzerinden de deniyoruz.
            if be == 0:
                be_wallet = lcu_handler.request(
                    "GET",
                    '/lol-inventory/v1/wallet?currencyTypes=["BE","BLUE_ESSENCE"]'
                )
                if be_wallet and be_wallet.status_code == 200:
                    be_data = be_wallet.json()
                    be_val = None

                    if isinstance(be_data, dict):
                        be_val = (
                            be_data.get("BE")
                            or be_data.get("be")
                            or be_data.get("blueEssence")
                            or be_data.get("BLUE_ESSENCE")
                            or be_data.get("blue_essence")
                            or be_data.get("lol_blue_essence")
                        )
                    elif isinstance(be_data, list) and be_data:
                        first = be_data[0]
                        if isinstance(first, dict):
                            be_val = (
                                first.get("BE")
                                or first.get("be")
                                or first.get("blueEssence")
                                or first.get("BLUE_ESSENCE")
                                or first.get("blue_essence")
                                or first.get("lol_blue_essence")
                            )

                    if be_val is not None:
                        be = to_int(be_val)
                else:
                    print("STATS be wallet status", be_wallet.status_code if be_wallet else "no response")

            # 4) RIOT POINTS -> /lol-inventory/v1/wallet?currencyTypes=["RP"]
            rp_wallet = None
            if rp == 0:  # only ask inventory if store wallet didn't give RP
                rp_wallet = lcu_handler.request("GET", '/lol-inventory/v1/wallet?currencyTypes=["RP"]')
                if rp_wallet and rp_wallet.status_code == 200:
                    rp_data = rp_wallet.json()
                    rp_val = None

                    if isinstance(rp_data, dict):
                        rp_val = (
                            rp_data.get("RP")
                            or rp_data.get("rp")
                            or (next(iter(rp_data.values()), None))
                        )
                    elif isinstance(rp_data, list) and rp_data:
                        first = rp_data[0]
                        if isinstance(first, dict):
                            rp_val = first.get("RP") or first.get("rp")
                        else:
                            rp_val = first
                    else:
                        rp_val = rp_data

                    if rp_val is not None:
                        rp = to_int(rp_val)
                else:
                    print("STATS rp wallet status", rp_wallet.status_code if rp_wallet else "no response")

            # Eğer hem BE hem RP 0 geldiyse, muhtemelen endpoint düzgün dönmemiştir.
            # Bu durumda ESKİ DEĞERLERİ KORU.
            if be == 0 and rp == 0:
                # print(
                #     "WALLET DEBUG: both BE and RP are 0.",
                #     "store:", store_wallet.text if store_wallet else "None",
                #     "inv:", rp_wallet.text if rp_wallet else "None"
                # )
                be = old_be
                rp = old_rp
            elif be == 0:
                be = old_be

            # Son hâli kaydet
            target_acc['blue_essence'] = be
            target_acc['rp'] = rp

            # 5) Skin sayısı
            skin_r = lcu_handler.request(
                "GET",
                '/lol-inventory/v1/inventory?inventoryTypes=["CHAMPION_SKIN"]'
            )
            if skin_r and skin_r.status_code == 200:
                skins = skin_r.json()
                target_acc['skin_count'] = len(skins) if isinstance(skins, list) else 0

            self.save_data()
            # print(
            #     f"Stats Saved: {current_riot_id} -> "
            #     f"Lvl {current_level}, Skins {target_acc.get('skin_count', 0)}, BE {be}, RP {rp}"
            # )

        except Exception as e:
            # print("Stats Error:", e)
            pass
        
    def background_loop(self):
        while self.running:
            if not lcu_handler.connected:
                lcu_handler.try_connect()

            if lcu_handler.connected:
                if time.time() - self.last_stats_update > 60:
                    self.fetch_and_save_stats()
                    self.last_stats_update = time.time()

                try:
                    if self.auto_accept_var.get() or self.auto_pick_var.get() or self.auto_ban_var.get():
                        r = lcu_handler.request("GET", "/lol-gameflow/v1/gameflow-phase")
                        if r and r.status_code == 200:
                            phase = r.json()
                            if self.auto_accept_var.get() and phase == "ReadyCheck":
                                lcu_handler.request("POST", "/lol-matchmaking/v1/ready-check/accept")
                            if phase == "ChampSelect":
                                if self.auto_ban_var.get() and self.target_ban_id != 0:
                                    s = lcu_handler.request("GET", "/lol-champ-select/v1/session")
                                    if s and s.status_code == 200:
                                        session = s.json()
                                        local_cell_id = session.get('localPlayerCellId')
                                        for actions in session.get('actions', []):
                                            for action in actions:
                                                if (
                                                    action['actorCellId'] == local_cell_id
                                                    and action['type'] == 'ban'
                                                    and not action['completed']
                                                ):
                                                    ban_data = {
                                                        "championId": self.target_ban_id,
                                                        "completed": True
                                                    }
                                                    lcu_handler.request(
                                                        "PATCH",
                                                        f"/lol-champ-select/v1/session/actions/{action['id']}",
                                                        ban_data
                                                    )
                                if self.auto_pick_var.get() and self.target_champ_id != 0:
                                    s = lcu_handler.request("GET", "/lol-champ-select/v1/session")
                                    if s and s.status_code == 200:
                                        session = s.json()
                                        local_cell_id = session.get('localPlayerCellId')
                                        for actions in session.get('actions', []):
                                            for action in actions:
                                                if (
                                                    action['actorCellId'] == local_cell_id
                                                    and action['type'] == 'pick'
                                                    and not action['completed']
                                                ):
                                                    pick_data = {
                                                        "championId": self.target_champ_id,
                                                        "completed": True
                                                    }
                                                    lcu_handler.request(
                                                        "PATCH",
                                                        f"/lol-champ-select/v1/session/actions/{action['id']}",
                                                        pick_data
                                                    )
                except:
                    lcu_handler.connected = False
            time.sleep(1.5)

    def load_icons(self):
        self.icons = {}
        assets_dir = resource_path("assets")

        def get_img(filename, size):
            path = os.path.join(assets_dir, filename)
            if not os.path.exists(path):
                path = os.path.join(os.path.abspath("."), "assets", filename)
            if os.path.exists(path):
                return ctk.CTkImage(
                    light_image=Image.open(path),
                    dark_image=Image.open(path),
                    size=size
                )
            return None

        s = (14, 14)
        self.icons['edit'] = get_img("edit.png", s)
        self.icons['delete'] = get_img("delete.png", s)
        self.icons['copy'] = get_img("copy.png", s)
        self.icons['show'] = get_img("show.png", s)
        self.icons['hide'] = get_img("hide.png", s)
        self.icons['save'] = get_img("save.png", (24, 24))

    def load_rank_images(self):
        self.rank_icons = {}
        rank_dir = resource_path(os.path.join("assets", "ranks"))
        size = (45, 45)
        tiers = [
            "IRON",
            "BRONZE",
            "SILVER",
            "GOLD",
            "PLATINUM",
            "EMERALD",
            "DIAMOND",
            "MASTER",
            "GRANDMASTER",
            "CHALLENGER",
            "UNRANKED"
        ]
        for tier in tiers:
            path = os.path.join(rank_dir, f"{tier}.png")
            if not os.path.exists(path):
                path = os.path.join(os.path.abspath("."), "assets", "ranks", f"{tier}.png")
            if os.path.exists(path):
                self.rank_icons[tier] = ctk.CTkImage(
                    light_image=Image.open(path),
                    dark_image=Image.open(path),
                    size=size
                )
            else:
                self.rank_icons[tier] = None

    def apply_account_defaults(self, acc):
        # missing stat fields to safe defaults so UI doesn't get None/N/A
        acc.setdefault("level", 0)
        acc.setdefault("blue_essence", 0)
        acc.setdefault("rp", 0)
        acc.setdefault("skin_count", 0)
        acc.setdefault("rank_tier", "UNRANKED")
        acc.setdefault("rank_div", "")
        acc.setdefault("lp", 0)
        acc.setdefault("last_seen", "Unknown")
        acc.setdefault("winrate", "")
        return acc

    def load_data(self):
        if not os.path.exists(DATA_FILE):
            return []
        with open(DATA_FILE, "r") as f:
            data = json.load(f)
            for acc in data:
                acc['login_pw'] = cipher_man.decrypt(acc['login_pw'])
                self.apply_account_defaults(acc)
            return data

    def save_data(self):
        data_to_save = []
        for acc in self.accounts:
            safe_acc = acc.copy()
            safe_acc['login_pw'] = cipher_man.encrypt(acc['login_pw'])
            data_to_save.append(safe_acc)
        with open(DATA_FILE, "w") as f:
            json.dump(data_to_save, f, indent=4)

    def add_account_to_db(self, new_acc):
        self.apply_account_defaults(new_acc)
        self.accounts.append(new_acc)
        self.save_data()
        self.filter_accounts(None)

    def delete_account(self, acc):
        if acc in self.accounts:
            self.accounts.remove(acc)
        self.save_data()
        self.filter_accounts(None)

    def copy_to_clipboard(self, text, btn):
        self.clipboard_clear()
        self.clipboard_append(text)
        self.update()
        orig_fg = btn.cget("fg_color")
        btn.configure(fg_color="green")
        self.after(1000, lambda: btn.configure(fg_color=orig_fg))

    def get_rank_score(self, acc):
        tier = acc.get("rank_tier", "UNRANKED")
        base = RANK_ORDER.get(tier, -1)
        div = {"I": 300, "II": 200, "III": 100, "IV": 0}.get(acc.get("rank_div", "IV"), 0)
        return base + div + acc.get("lp", 0)

    def toggle_sort(self):
        self.sort_descending = not self.sort_descending
        self.sort_btn.configure(
            text="⬇️ Rank: High to Low" if self.sort_descending else "⬆️ Rank: Low to High"
        )
        self.filter_accounts(None)

    def filter_accounts(self, *args):
        for w in self.main_area.winfo_children():
            w.destroy()
        selected = self.server_var.get()
        search_query = self.search_var.get().lower()

        filtered = []
        for acc in self.accounts:
            if acc["server"] != selected:
                continue
            search_text = f"{acc['riot_id']} {acc.get('rank_tier','')} {acc.get('note','')} {acc['login_id']}".lower()
            if search_query and search_query not in search_text:
                continue
            filtered.append(acc)

        filtered.sort(key=self.get_rank_score, reverse=self.sort_descending)
        if not filtered:
            ctk.CTkLabel(
                self.main_area,
                text=f"No accounts in {selected}",
                font=("Arial", 14)
            ).pack(pady=20)
        for acc in filtered:
            self.create_card(acc)

    def create_card(self, acc):
        card = ctk.CTkFrame(self.main_area, border_width=1, border_color="#404040", fg_color="#2b2b2b")
        card.pack(fill="x", padx=5, pady=8)
        card.bind("<Button-1>", lambda event, a=acc: self.open_details_window(a))
        content = ctk.CTkFrame(card, fg_color="transparent")
        content.pack(fill="x", padx=15, pady=10)
        content.bind("<Button-1>", lambda event, a=acc: self.open_details_window(a))

        rank_img = self.rank_icons.get(acc.get('rank_tier', 'UNRANKED'))
        if rank_img:
            lbl_img = ctk.CTkLabel(content, text="", image=rank_img)
            lbl_img.pack(side="left", padx=(0, 15))
            lbl_img.bind("<Button-1>", lambda event, a=acc: self.open_details_window(a))

        info_frame = ctk.CTkFrame(content, fg_color="transparent")
        info_frame.pack(side="left", anchor="w")
        info_frame.bind("<Button-1>", lambda event, a=acc: self.open_details_window(a))
        ctk.CTkLabel(
            info_frame,
            text=acc['riot_id'],
            font=("Arial", 18, "bold"),
            text_color="white"
        ).pack(anchor="w")
        if 'winrate' in acc:
            wr_color = "#2ecc71" if any(x in acc['winrate'] for x in "56789") else "#e74c3c"
            ctk.CTkLabel(
                info_frame,
                text=acc['winrate'],
                font=("Arial", 11),
                text_color=wr_color
            ).pack(anchor="w")

        rank_txt = f"{acc.get('rank_tier', 'UNRANKED')} {acc.get('rank_div', '')}"
        lbl_rank = ctk.CTkLabel(
            content,
            text=f"{rank_txt} ({acc.get('lp', 0)} LP)",
            font=("Arial", 14, "bold"),
            text_color=RANK_COLORS.get(acc.get('rank_tier', 'UNRANKED'), "gray")
        )
        lbl_rank.pack(side="right")
        lbl_rank.bind("<Button-1>", lambda event, a=acc: self.open_details_window(a))

    def calculate_time_ago(self, ms):
        if not ms:
            return "Unknown"
        try:
            diff = datetime.now() - datetime.fromtimestamp(ms / 1000)
            if diff.days == 0:
                return "Today"
            if diff.days == 1:
                return "Yesterday"
            return f"{diff.days} days ago"
        except:
            return "Unknown"

    def start_auto_login(self, acc):
        try:
            riot_path = self.riot_client_path
            if sys.platform == "darwin":
                if riot_path and os.path.isdir(riot_path) and riot_path.endswith(".app"):
                    common_paths = [
                        "/Applications/Riot Games/Riot Client.app/Contents/MacOS/RiotClientServices",
                        "/Users/Shared/Riot Games/Riot Client.app/Contents/MacOS/RiotClientServices",
                        os.path.expanduser(
                            "~/Applications/Riot Games/Riot Client.app/Contents/MacOS/RiotClientServices"
                        ),
                        "/Applications/Riot Client.app/Contents/MacOS/RiotClientServices"
                    ]
                    found = False
                    for cp in common_paths:
                        if os.path.exists(cp):
                            riot_path = cp
                            found = True
                            break
                    if not found:
                        binary_candidates = ["LeagueClient", "RiotClientServices", "League of Legends"]
                        for bin_name in binary_candidates:
                            possible = os.path.join(riot_path, "Contents", "MacOS", bin_name)
                            if os.path.exists(possible):
                                riot_path = possible
                                break
            if not riot_path or not os.path.exists(riot_path):
                if sys.platform == "darwin":
                    pass
                else:
                    possible_paths = ["C:\\Riot Games\\Riot Client\\RiotClientServices.exe"]
                    for p in possible_paths:
                        if os.path.exists(p):
                            riot_path = p
                            break
            if not riot_path or not os.path.exists(riot_path):
                return
            if os.path.isdir(riot_path):
                return
            if sys.platform == "darwin":
                subprocess.Popen(
                    [riot_path, "--launch-product=league_of_legends", "--launch-patchline=live"],
                    start_new_session=True
                )
            else:
                subprocess.Popen(
                    [riot_path, "--launch-product=league_of_legends", "--launch-patchline=live"],
                    creationflags=subprocess.DETACHED_PROCESS
                )
            time.sleep(10)
            # Kullanıcı adını paste ederek yaz (i/ı problemi için klavye layout'tan bağımsız)
            self.clipboard_clear()
            self.clipboard_append(acc['login_id'])
            self.update()
            pyautogui.hotkey('command' if sys.platform == 'darwin' else 'ctrl', 'a')
            pyautogui.press('backspace')
            pyautogui.hotkey('command' if sys.platform == 'darwin' else 'ctrl', 'v')
            time.sleep(0.5)
            pyautogui.press('tab')
            time.sleep(0.5)
            self.clipboard_clear()
            self.clipboard_append(acc['login_pw'])
            self.update()
            if sys.platform == 'darwin':
                pyautogui.hotkey('command', 'v')
            else:
                pyautogui.hotkey('ctrl', 'v')
            time.sleep(0.5)
            pyautogui.press('enter')
        except:
            pass

    def fetch_rank_without_api(self, server, riot_id):
        """League of Graphs üzerinden rank çekme"""
        try:
            if "#" not in riot_id:
                return None

            name, tag = riot_id.split("#", 1)

            region_map = {"TR1": "tr", "EUW1": "euw", "EUN1": "eune", "NA1": "na"}
            region = region_map.get(server, "tr")

            slug = urllib.parse.quote(f"{name}-{tag}", safe="")
            url = f"https://www.leagueofgraphs.com/summoner/{region}/{slug}"

            ua = UserAgent()
            headers = {"User-Agent": ua.random}
            response = requests.get(url, headers=headers, timeout=5)
            if response.status_code != 200:
                print("LoG SCRAPE ERROR:", response.status_code, url)
                return None

            soup = BeautifulSoup(response.text, 'html.parser')
            tier_elem = soup.find(class_="leagueTier")
            if tier_elem:
                full_rank = tier_elem.text.strip().upper()
                parts = full_rank.split()
                tier = parts[0]
                div = parts[1] if len(parts) > 1 else ""
                lp = 0

                lp_elem = soup.find(class_="league-points")
                if lp_elem:
                    lp = int(re.sub(r'[^0-9]', '', lp_elem.text.strip()) or 0)

                wr_elem = soup.find(class_="pie-chart-wrapper")
                wr_text = ""
                if wr_elem and wr_elem.get("data-percentage"):
                    wr_text = f"%{wr_elem.get('data-percentage')} Win Rate"

                return {"rank_tier": tier, "rank_div": div, "lp": lp, "winrate": wr_text}

            return {"rank_tier": "UNRANKED", "rank_div": "", "lp": 0, "winrate": ""}

        except Exception as e:
            print("LoG SCRAPE EXCEPTION:", e)
            return None

    def update_ranks_from_api(self):
        def fetch():
            self.refresh_btn.configure(state="disabled", text="UPDATING...")
            for acc in self.accounts:
                try:
                    print(f"{acc['riot_id']} için Web Scraping yapılıyor...")
                    scraped_data = self.fetch_rank_without_api(acc['server'], acc['riot_id'])
                    if scraped_data:
                        acc.update(scraped_data)
                except Exception as e:
                    print(e)
                time.sleep(1.5)
            self.save_data()
            self.after(0, lambda: self.filter_accounts(None))
            self.after(0, lambda: self.refresh_btn.configure(state="normal", text="UPDATE RANKS"))
        threading.Thread(target=fetch).start()

if __name__ == "__main__":
    app = LolManagerApp()
    app.mainloop()