"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryStorageAdapter = void 0;
/**
 * In-memory storage adapter (global variable storage)
 */
class MemoryStorageAdapter {
    storage = new Map();
    getItem(key) {
        return this.storage.get(key) || null;
    }
    setItem(key, value) {
        this.storage.set(key, value);
    }
    removeItem(key) {
        this.storage.delete(key);
    }
    clear() {
        this.storage.clear();
    }
}
exports.MemoryStorageAdapter = MemoryStorageAdapter;
//# sourceMappingURL=memoryStorage.js.map