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
export class OlakaiFunctionBlocked extends OlakaiSDKError {
  constructor(message: string) {
    super(message);
  }
}