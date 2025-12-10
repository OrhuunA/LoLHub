import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

class CryptoManager {
    private algorithm = 'aes-256-cbc';
    private userDataPath: string = '';

    init(userDataPath: string) {
        this.userDataPath = userDataPath;
    }

    private get keyPath() {
        if (!this.userDataPath) throw new Error("CryptoManager not initialized");
        return path.join(this.userDataPath, 'secret.key');
    }

    private getKey(): Buffer {
        if (fs.existsSync(this.keyPath)) {
            return fs.readFileSync(this.keyPath);
        } else {
            const key = crypto.randomBytes(32);
            fs.writeFileSync(this.keyPath, key);
            return key;
        }
    }

    encrypt(text: string): string {
        try {
            const iv = crypto.randomBytes(16);
            const key = this.getKey();
            const cipher = crypto.createCipheriv(this.algorithm, key, iv);
            let encrypted = cipher.update(text);
            encrypted = Buffer.concat([encrypted, cipher.final()]);
            return iv.toString('hex') + ':' + encrypted.toString('hex');
        } catch (error) {
            console.error('Encryption failed:', error);
            return text;
        }
    }

    decrypt(text: string): string {
        try {
            const textParts = text.split(':');
            if (textParts.length < 2) return text;

            const iv = Buffer.from(textParts.shift()!, 'hex');
            const encryptedText = Buffer.from(textParts.join(':'), 'hex');
            const key = this.getKey();
            const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
            let decrypted = decipher.update(encryptedText);
            decrypted = Buffer.concat([decrypted, decipher.final()]);
            return decrypted.toString();
        } catch (error) {
            return text; // Return original if decryption fails
        }
    }
}

export const cryptoManager = new CryptoManager();
