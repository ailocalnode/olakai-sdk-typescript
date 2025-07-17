"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTransformMiddleware = createTransformMiddleware;
// Data transformation middleware
function createTransformMiddleware(options) {
    const { transformArgs, transformResult } = options;
    return {
        name: "transform",
        beforeCall: async (args) => {
            if (transformArgs) {
                return await transformArgs(args);
            }
            return args;
        },
        afterCall: async (result, _args) => {
            if (transformResult) {
                return await transformResult(result);
            }
            return result;
        },
    };
}
//# sourceMappingURL=transform.js.map