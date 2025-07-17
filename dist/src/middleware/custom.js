"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCustomMiddleware = void 0;
const createCustomMiddleware = (options) => {
    return {
        name: options.name,
        beforeCall: options.beforeCall,
        afterCall: options.afterCall,
        onError: options.onError,
    };
};
exports.createCustomMiddleware = createCustomMiddleware;
//# sourceMappingURL=custom.js.map