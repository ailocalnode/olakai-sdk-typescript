import { monitor } from "./src/monitor";

// Example 1: Basic control with default error handling
const basicControlledFunction = monitor({
  name: "basic-controlled-function",
  capture: ({ args, result }) => ({
    input: args[0],
    output: result,
  }),
  control: {
    enabled: true,
    captureInput: (args) => args[0], // Send first argument to control API
    // Will throw default error if blocked
  },
})(async (input: string) => {
  console.log("Processing:", input);
  return `Processed: ${input}`;
});

// Example 2: Control with custom error handling
const customControlledFunction = monitor({
  name: "custom-controlled-function",
  capture: ({ args, result }) => ({
    input: args[0],
    output: result,
  }),
  control: {
    enabled: true,
    captureInput: (args) => args[0],
    onBlocked: (args, controlResponse) => {
      console.log("Function blocked!", controlResponse);
      // Throw custom error
      throw new Error(`Access denied: ${controlResponse.reason}`);
    },
  },
})(async (input: string) => {
  console.log("Processing:", input);
  return `Processed: ${input}`;
});

// Example 3: Control with graceful degradation
const gracefulControlledFunction = monitor({
  name: "graceful-controlled-function",
  capture: ({ args, result }) => ({
    input: args[0],
    output: result,
  }),
  control: {
    enabled: true,
    captureInput: (args) => args[0],
    onBlocked: (args, controlResponse) => {
      console.log("Function blocked, returning default response");
      // Don't throw - let execution continue with modified behavior
      return;
    },
    onError: (error, args) => {
      console.warn("Control API error:", error);
      // Allow execution to continue if control API fails
      return true;
    },
  },
})(async (input: string) => {
  console.log("Processing:", input);
  return `Processed: ${input}`;
});

// Example 4: Conditional control based on input
const conditionalControlledFunction = monitor({
  name: "conditional-controlled-function",
  capture: ({ args, result }) => ({
    input: args[0],
    output: result,
  }),
  control: {
    enabled: (args) => args[0].includes("sensitive"), // Only control sensitive inputs
    captureInput: (args) => args[0],
    sanitize: true, // Sanitize input before sending to control API
    onBlocked: (args, controlResponse) => {
      throw new Error(`Sensitive content blocked: ${controlResponse.reason}`);
    },
  },
})(async (input: string) => {
  console.log("Processing:", input);
  return `Processed: ${input}`;
});

// Example 5: Control with custom endpoint and retry logic
const advancedControlledFunction = monitor({
  name: "advanced-controlled-function",
  capture: ({ args, result }) => ({
    input: args[0],
    output: result,
  }),
  control: {
    enabled: true,
    endpoint: "https://custom-control-api.com/check",
    timeout: 5000,
    retries: 2,
    priority: "high",
    captureInput: (args) => ({
      userInput: args[0],
      userId: args[1],
      timestamp: Date.now(),
    }),
    onBlocked: (args, controlResponse) => {
      // Log the blocking event
      console.log("Function execution blocked:", {
        input: args[0],
        userId: args[1],
        reason: controlResponse.reason,
        metadata: controlResponse.metadata,
      });
      
      // Throw custom error with additional context
      throw new Error(`Access denied for user ${args[1]}: ${controlResponse.reason}`);
    },
    onError: (error, args) => {
      // Log the error but allow execution if it's a timeout
      console.error("Control API error:", error);
      
      if (error.message.includes("timeout")) {
        console.log("Allowing execution due to timeout");
        return true;
      }
      
      // Block execution for other errors
      return false;
    },
  },
})(async (input: string, userId: string) => {
  console.log(`Processing input for user ${userId}:`, input);
  return `Processed: ${input}`;
});

// Usage examples
async function examples() {
  try {
    // Basic usage
    const result1 = await basicControlledFunction("Hello world");
    console.log("Result 1:", result1);
  } catch (error) {
    console.error("Error 1:", error.message);
  }

  try {
    // Custom error handling
    const result2 = await customControlledFunction("Test input");
    console.log("Result 2:", result2);
  } catch (error) {
    console.error("Error 2:", error.message);
  }

  try {
    // Graceful degradation
    const result3 = await gracefulControlledFunction("Another test");
    console.log("Result 3:", result3);
  } catch (error) {
    console.error("Error 3:", error.message);
  }

  try {
    // Conditional control
    const result4a = await conditionalControlledFunction("normal input");
    console.log("Result 4a:", result4a);
    
    const result4b = await conditionalControlledFunction("sensitive data");
    console.log("Result 4b:", result4b);
  } catch (error) {
    console.error("Error 4:", error.message);
  }

  try {
    // Advanced control
    const result5 = await advancedControlledFunction("user input", "user123");
    console.log("Result 5:", result5);
  } catch (error) {
    console.error("Error 5:", error.message);
  }
}

// Run examples
examples(); 