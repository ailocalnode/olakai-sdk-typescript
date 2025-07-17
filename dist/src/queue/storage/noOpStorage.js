"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoOpStorageAdapter = void 0;
/**
 * No-op storage adapter for when storage is disabled
 */
class NoOpStorageAdapter {
    getItem(_key) {
        return null;
    }
    setItem(_key, _value) {
        // No-op
    }
    removeItem(_key) {
        // No-op
    }
    clear() {
        // No-op
    }
}
exports.NoOpStorageAdapter = NoOpStorageAdapter;
//# sourceMappingURL=noOpStorage.js.map