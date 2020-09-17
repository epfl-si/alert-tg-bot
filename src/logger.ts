import winston from 'winston'
const { combine, timestamp, printf } = winston.format

const options: any = {
  console: {
    level: process.env.LOG_LEVEL || 'error', // Options: 'debug', 'info', 'error'
    handleExceptions: true,
    json: false,
    colorize: true,
  },
}

const logFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} ${level}: ${message}`
})

const logger: winston.Logger = winston.createLogger({
  format: combine(
    winston.format.colorize(),
    timestamp(),
    logFormat,
  ),
  transports: [new winston.transports.Console(options.console)],
})

class Logger {

  public error(param: any) {
    logger.error(param)
  }

  public info(param: any) {
    logger.info(param)
  }

  public debug(param: any) {
    logger.debug(param)
  }

  public expressAppLogger = () => {
    return (req: any, res: any, next: any) => {
      logger.info(
        `${req.ip} ${req.method} ${req.url} (user-agent: ${req.get('user-agent')})`,
      )
      logger.debug(
        // see https://expressjs.com/en/api.html#req
        `${req.ip} ${req.method} ${req.url} ${req.path} ${req.originalUrl} ${req.baseUrl} (user-agent: ${req.get('user-agent')})\n${req.body}`,
      )
      next()
    }
  }

  public expressLogError = () => {
    return (err: string, req: any, res: any, next: any) => {
      logger.error(err)
      next()
    }
  }

}

const loggerFacet = new Logger()
export { Logger, loggerFacet as logger }
