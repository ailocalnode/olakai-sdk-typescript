/**
 * OlakaiException is the base class for all Olakai exceptions.
 * It is used to throw exceptions that are specific to Olakai SDK.
 */

/**
 * OlakaiSDKError is the base class for all Olakai SDK errors.
 */
export class OlakaiSDKError extends Error {
  constructor(message: string) {
    super(message);
  }
}

/**
 * OlakaiFunctionBlocked is thrown when a function is blocked by Olakai's Control API.
 */
export class OlakaiBlockedError extends OlakaiSDKError {
  details: {
    detectedSensitivity: string[];
    isAllowedPersona: boolean;
  };
  constructor(message: string, details: { detectedSensitivity: string[]; isAllowedPersona: boolean }) {
    super(message);
    this.details = details;
  }
}

/**
 * APIKeyMissingError is thrown when an API key is missing.
 */
export class APIKeyMissingError extends OlakaiSDKError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * URLConfigurationError is thrown when a URL is not configured.
 */
export class URLConfigurationError extends OlakaiSDKError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * ConfigNotInitializedError is thrown when the SDK config is not initialized.
 */
export class ConfigNotInitializedError extends OlakaiSDKError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * HTTPError is thrown when an HTTP error occurs.
 */
export class HTTPError extends OlakaiSDKError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * CircuitBreakerOpenError is thrown when the circuit breaker is OPEN.
 */
export class CircuitBreakerOpenError extends OlakaiSDKError {
  constructor(message: string) {
    super(message);
  }
}