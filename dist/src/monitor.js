"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addMiddleware = addMiddleware;
exports.removeMiddleware = removeMiddleware;
exports.monitor = monitor;
const client_1 = require("./client");
const utils_1 = require("./utils");
// Global middleware registry
const middlewares = [];
function addMiddleware(middleware) {
    middlewares.push(middleware);
}
function removeMiddleware(name) {
    const index = middlewares.findIndex((m) => m.name === name);
    if (index > -1) {
        middlewares.splice(index, 1);
    }
}
async function shouldControl(options, args) {
    const controlOptions = options.control;
    // If control is not configured, allow execution
    if (!controlOptions) {
        return false;
    }
    // Check if control is enabled
    if (typeof controlOptions.enabled === "boolean" && !controlOptions.enabled) {
        return false;
    }
    if (typeof controlOptions.enabled === "function" && !controlOptions.enabled(args)) {
        return false;
    }
    try {
        const config = (0, client_1.getConfig)();
        // Prepare input for control check
        const input = controlOptions.captureInput(args);
        // Sanitize input if required
        const sanitizedInput = controlOptions.sanitize
            ? sanitizeData(input, config.sanitizePatterns)
            : input;
        // Create control payload
        const payload = {
            input: sanitizedInput,
        };
        // Send control request
        const response = await (0, client_1.sendToControlAPI)(payload, {
            endpoint: controlOptions.endpoint,
            retries: controlOptions.retries,
            timeout: controlOptions.timeout,
            priority: controlOptions.priority,
        });
        (0, utils_1.olakaiLoggger)(`Control response: ${JSON.stringify(response)}`, "info");
        // If not allowed, handle the blocking
        if (!response.allowed) {
            if (controlOptions.onBlocked) {
                // Let the developer handle the blocking
                controlOptions.onBlocked(args, response);
                // If onBlocked doesn't throw, we assume execution should be blocked
                return true;
            }
            else {
                // Default behavior: throw an error
                throw new Error(`Function execution blocked: ${response.reason || 'No reason provided'}`);
            }
        }
        return false; // Allow execution
    }
    catch (error) {
        if (controlOptions.onError) {
            // Let the developer decide what to do on error
            const shouldAllow = controlOptions.onError(error, args);
            if (shouldAllow) {
                (0, utils_1.olakaiLoggger)(`Control error handled, allowing execution`, "info");
                return false; // Allow execution
            }
        }
        // If no error handler or it returns false, re-throw the error
        throw error;
    }
}
/**
 * Sanitize data by replacing sensitive information with a placeholder
 * @param data - The data to sanitize
 * @param patterns - The patterns to replace
 * @returns The sanitized data
 */
function sanitizeData(data, patterns) {
    if (!patterns?.length)
        return data;
    let serialized = JSON.stringify(data);
    patterns.forEach((pattern) => {
        serialized = serialized.replace(pattern, "[REDACTED]");
    });
    try {
        const parsed = JSON.parse(serialized);
        (0, utils_1.olakaiLoggger)(`Data successfully sanitized`, "info");
        return parsed;
    }
    catch {
        (0, utils_1.olakaiLoggger)(`Data failed to sanitize`, "warn");
        return "[SANITIZED]";
    }
}
function createErrorInfo(error) {
    return {
        errorMessage: error instanceof Error ? error.message : String(error),
        stackTrace: error instanceof Error ? error.stack : undefined,
    };
}
/**
 * Resolve dynamic chatId and userId from options
 * @param options - Monitor options
 * @param args - Function arguments
 * @returns Object with resolved chatId and userId
 */
function resolveIdentifiers(options, args) {
    let chatId = "123";
    let email = "anonymous";
    if (typeof options.chatId === "function") {
        try {
            chatId = options.chatId(args);
            (0, utils_1.olakaiLoggger)("ChatId resolved...", "info");
        }
        catch (error) {
            (0, utils_1.olakaiLoggger)(`Error during chatId resolution: ${error}. \n Continuing execution...`, "error");
        }
    }
    else {
        chatId = options.chatId || "123";
    }
    if (typeof options.email === "function") {
        try {
            email = options.email(args);
            (0, utils_1.olakaiLoggger)("Email resolved...", "info");
        }
        catch (error) {
            (0, utils_1.olakaiLoggger)(`Error during userId resolution: ${error}. \n Continuing execution...`, "error");
        }
    }
    else {
        email = options.email || "anonymous";
    }
    return { chatId, email };
}
// Implementation
function monitor(arg1, arg2) {
    if (typeof arg1 === "function" && arg2) {
        // Direct form: monitor(fn, options)
        const fn = arg1;
        const options = arg2;
        return monitor(options)(fn);
    }
    // Curried form: monitor(options)(fn)
    const options = arg1;
    return (fn) => {
        return async (...args) => {
            (0, utils_1.olakaiLoggger)(`Monitoring function: ${fn.name}`, "info");
            (0, utils_1.olakaiLoggger)(`Monitoring options: ${JSON.stringify(options)}`, "info");
            (0, utils_1.olakaiLoggger)(`Monitoring arguments: ${JSON.stringify(args)}`, "info");
            let config;
            let start;
            let processedArgs = args;
            // Safely initialize monitoring data
            try {
                config = (0, client_1.getConfig)();
                start = Date.now();
            }
            catch (error) {
                (0, utils_1.olakaiLoggger)(`Monitoring initialization failed: \n${error}`, "error");
                // If monitoring setup fails, still execute the function
                return await fn(...args);
            }
            (0, utils_1.olakaiLoggger)("Monitoring initialization completed...", "info");
            (0, utils_1.olakaiLoggger)("Checking if we should control this call...", "info");
            let shouldControlCall = false;
            try {
                shouldControlCall = await shouldControl(options, args);
            }
            catch (error) {
                // If shouldControl throws an error, it means execution was blocked
                // We should re-throw this error to prevent function execution
                throw error;
            }
            (0, utils_1.olakaiLoggger)("Should control check completed...", "info");
            //If we should control (block execution), return early
            if (shouldControlCall) {
                // This should not happen in normal flow as shouldControl throws on block
                // But kept for safety
                throw new Error("Function execution blocked by control logic");
            }
            (0, utils_1.olakaiLoggger)("Applying beforeCall middleware...", "info");
            try {
                for (const middleware of middlewares) {
                    if (middleware.beforeCall) {
                        const result = await middleware.beforeCall(processedArgs);
                        if (result) {
                            processedArgs = result;
                        }
                    }
                }
            }
            catch (error) {
                (0, utils_1.olakaiLoggger)(`BeforeCall middleware failed: ${error}. \n Continuing execution...`, "error");
            }
            (0, utils_1.olakaiLoggger)("BeforeCall middleware completed...", "info");
            let result;
            let functionError = null;
            (0, utils_1.olakaiLoggger)("Executing the original function...", "info");
            try {
                result = await fn(...processedArgs);
                (0, utils_1.olakaiLoggger)("Original function executed successfully...", "info");
            }
            catch (error) {
                (0, utils_1.olakaiLoggger)(`Original function failed: ${error}. \n Continuing execution...`, "error");
                functionError = error;
                // Handle error case monitoring
                try {
                    // Apply error middleware
                    for (const middleware of middlewares) {
                        if (middleware.onError) {
                            await middleware.onError(functionError, processedArgs);
                        }
                    }
                    // Capture error data if onError handler is provided
                    if (options.onError) {
                        const errorResult = options.onError(functionError, processedArgs);
                        const errorInfo = createErrorInfo(functionError);
                        const { chatId, email } = resolveIdentifiers(options, args);
                        const payload = {
                            prompt: "",
                            response: "",
                            errorMessage: (0, utils_1.toApiString)(errorInfo.errorMessage) +
                                (0, utils_1.toApiString)(errorResult),
                            chatId: (0, utils_1.toApiString)(chatId),
                            email: (0, utils_1.toApiString)(email),
                        };
                        await (0, client_1.sendToAPI)(payload, {
                            retries: config.retries,
                            timeout: config.timeout,
                            priority: "high", // Errors always get high priority
                        });
                    }
                }
                catch (error) {
                    (0, utils_1.olakaiLoggger)(`Error during error monitoring: ${error}.`, "error");
                }
                ;
                (0, utils_1.olakaiLoggger)("Error monitoring completed...", "info");
                throw functionError; // Re-throw the original error to be handled by the caller
            }
            // Handle success case asynchronously
            makeMonitoringCall(result, processedArgs, args, options, config, start);
            return result; // We know result is defined if we get here (no function error)
        };
    };
}
async function makeMonitoringCall(result, processedArgs, args, options, config, start) {
    try {
        (0, utils_1.olakaiLoggger)("Applying afterCall middleware...", "info");
        for (const middleware of middlewares) {
            if (middleware.afterCall) {
                const middlewareResult = await middleware.afterCall(result, processedArgs);
                if (middlewareResult) {
                    result = middlewareResult;
                }
            }
        }
    }
    catch (error) {
        (0, utils_1.olakaiLoggger)(`Error during afterCall middleware: ${error}. \n Continuing execution...`, "error");
    }
    (0, utils_1.olakaiLoggger)("AfterCall middleware completed...", "info");
    (0, utils_1.olakaiLoggger)("Capturing success data...", "info");
    // Capture success data
    const captureResult = options.capture({
        args: processedArgs,
        result,
    });
    (0, utils_1.olakaiLoggger)("Success data captured...", "info");
    const prompt = options.sanitize
        ? sanitizeData(captureResult.input, config.sanitizePatterns)
        : captureResult.input;
    const response = options.sanitize
        ? sanitizeData(captureResult.output, config.sanitizePatterns)
        : captureResult.output;
    (0, utils_1.olakaiLoggger)("Resolving identifiers...", "info");
    const { chatId, email } = resolveIdentifiers(options, args);
    (0, utils_1.olakaiLoggger)("Creating payload...", "info");
    const payload = {
        prompt: (0, utils_1.toApiString)(prompt),
        response: (0, utils_1.toApiString)(response),
        chatId: (0, utils_1.toApiString)(chatId),
        email: (0, utils_1.toApiString)(email),
        tokens: 0,
        requestTime: Number(Date.now() - start),
        ...((options.task !== undefined && options.task !== "") ? { task: options.task } : {}),
        ...((options.subTask !== undefined && options.subTask !== "") ? { subTask: options.subTask } : {}),
        ...((options.shouldScore !== undefined) ? { shouldScore: options.shouldScore } : {}),
    };
    (0, utils_1.olakaiLoggger)(`Successfully defined payload: ${JSON.stringify(payload)}`, "info");
    // Send to API (with batching and retry logic handled in client)
    try {
        await (0, client_1.sendToAPI)(payload, {
            retries: config.retries,
            timeout: config.timeout,
            priority: options.priority || "normal",
        });
    }
    catch (error) {
        (0, utils_1.olakaiLoggger)(`Error during api call: ${error}.`, "error");
    }
    (0, utils_1.olakaiLoggger)("API call completed...", "info");
    //End of monitoring operations
    (0, utils_1.olakaiLoggger)("Monitoring operations completed...", "info");
}
//# sourceMappingURL=monitor.js.map