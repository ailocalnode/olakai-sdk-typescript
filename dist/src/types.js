"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorCode = exports.StorageType = void 0;
var StorageType;
(function (StorageType) {
    StorageType["MEMORY"] = "memory";
    StorageType["FILE"] = "file";
    StorageType["LOCAL_STORAGE"] = "localStorage";
    StorageType["AUTO"] = "auto";
    StorageType["DISABLED"] = "disabled";
})(StorageType || (exports.StorageType = StorageType = {}));
var ErrorCode;
(function (ErrorCode) {
    ErrorCode[ErrorCode["SUCCESS"] = 200] = "SUCCESS";
    ErrorCode[ErrorCode["PARTIAL_SUCCESS"] = 207] = "PARTIAL_SUCCESS";
    ErrorCode[ErrorCode["FAILED"] = 500] = "FAILED";
    ErrorCode[ErrorCode["BAD_REQUEST"] = 400] = "BAD_REQUEST";
})(ErrorCode || (exports.ErrorCode = ErrorCode = {}));
//# sourceMappingURL=types.js.map