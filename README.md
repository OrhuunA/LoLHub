# LoLHub - Advanced League of Legends Account Manager

LoLHub is a modern, Electron-based desktop application designed to streamline the management of multiple League of Legends accounts. It provides seamless auto-login, rank tracking, inventory visualization (Skins & Champions), and game automation tools.

## Features

### 🔐 Account Management
- **Auto Login**: Switch accounts instantly with a single click, bypassing the Riot Client login screen.
- **Secure Storage**: Account credentials are encrypted locally using `crypto` APIs.
- **Stats Tracking**: Automatically tracks Rank, LP, Blue Essence, and RP for all accounts.

### 🎨 Visual & Inventory (DDragon Integration)
> ⚠️ **Note**: DDragon image integration is currently unstable/not working and is being investigated.
- **champion Grid**: View all owned champions with smart search filtering. (Images temporarily disabled).
- **Skin Showcase**: Displays your owned skins.
- **Dynamic Backgrounds**: Account cards feature random skin backgrounds from your inventory.

### 🛠️ Game Tools
- **Auto Queue**: Automatically accept match prompts.
- **Auto Pick/Ban**: Pre-select your favorite champions and ban unwanted ones automatically.
- **Config Sync**: Backup and Restore your game settings (Keybinds, Interface, etc.) to apply them across different accounts instantly.

### 👻 Offline & Privacy
- **Offline Mode**: (Temporarily Disabled) Launch the game in "Ghost Mode" to appear offline to friends.
- **Privacy First**: All data is stored locally on your machine.

## Installation & Usage

### Prerequisites
- Node.js (v18 or higher)
- League of Legends installed

### Setup
1. Clone the repository.
2. Install dependencies:
   ```bash
   cd electron-app
   npm install
   ```

### Running the App
- **Method 1 (Recommended)**: Double-click `start_app.bat` in the root folder. This automatically requests Admin privileges (required for Client interaction) and starts the app.
- **Method 2 (Manual)**:
   ```bash
   cd electron-app
   npm run dev
   ```

## Technologies
- **Electron**: Cross-platform desktop framework.
- **React + TypeScript**: Modern, type-safe UI development.
- **TailwindCSS**: Beautiful, responsive styling.
- **LCU API**: Direct integration with the League Client Update API for real-time control.

## Disclaimer
This project is not endorsed by Riot Games and does not reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games and all associated properties are trademarks or registered trademarks of Riot Games, Inc.
