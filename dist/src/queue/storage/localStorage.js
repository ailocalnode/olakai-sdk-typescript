"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalStorageAdapter = void 0;
/**
 * Browser localStorage adapter
 */
class LocalStorageAdapter {
    getItem(key) {
        try {
            return localStorage.getItem(key);
        }
        catch (err) {
            console.warn('[Olakai SDK] LocalStorage access failed:', err);
            return null;
        }
    }
    setItem(key, value) {
        try {
            localStorage.setItem(key, value);
        }
        catch (err) {
            console.warn('[Olakai SDK] LocalStorage write failed:', err);
        }
    }
    removeItem(key) {
        try {
            localStorage.removeItem(key);
        }
        catch (err) {
            console.warn('[Olakai SDK] LocalStorage remove failed:', err);
        }
    }
    clear() {
        try {
            localStorage.clear();
        }
        catch (err) {
            console.warn('[Olakai SDK] LocalStorage clear failed:', err);
        }
    }
}
exports.LocalStorageAdapter = LocalStorageAdapter;
//# sourceMappingURL=localStorage.js.map