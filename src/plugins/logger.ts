import { createLogger } from 'vue-logger-plugin'

const logger = createLogger({
  enabled: true,
  afterHooks: [],
})

/**
 * Returns a function that calls `logger.debug` with pre-defined
 * prefix message.
 *
 * Usage example:
 *
 *     const debugAuth = logDebugWithPrefix("Auth store")
 *
 *     debugAuth("triggered") // [Auth store]: triggered
 *
 *     debugAuth("Error occured", e) // [Auth store]: Error occured ...Exception description
 */
export function logDebugWithPrefix(prefix: string): (...args: any) => void {
  return (...args: any) => {
    logger.debug(`[${prefix}]: `, ...args)
  }
}

export default logger