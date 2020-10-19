import winston from 'winston'

const {
 colorize, combine, timestamp, printf
} = winston.format

const options: any = {
  console: {
    handleExceptions: true,
    json: false,
    colorize: true,
  },
}

const logFormat = printf(({ _timestamp, level, message }) => `${_timestamp} ${level}: ${message}`)

const logger: winston.Logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'error', // Options: 'debug', 'info', 'error'
  format: combine(timestamp(), colorize(), logFormat),
  transports: [new winston.transports.Console(options.console)],
})

const delegate = <T extends Function>(that: winston.Logger, method: T): T => method.bind(that)

class Logger {
  // delegate error, info and debug to logger
  public error = delegate(logger, logger.error)

  public info = delegate(logger, logger.info)

  public debug = delegate(logger, logger.debug)

  public expressAppLogger = () => (req: any, res: any, next: any) => {
      logger.info(`Express | ip: ${req.ip} method: ${req.method} url: ${req.url} (user-agent: ${req.get('user-agent')})`)
      logger.debug(
        // see https://expressjs.com/en/api.html#req
        // https://stackoverflow.com/questions/56090851/winston-logging-object
        `Express | ip: ${req.ip} method: ${req.method} url: ${req.url} ${req.path} ${req.originalUrl} ${req.baseUrl} (user-agent: ${req.get(
          'user-agent'
        )})`
      )
      next()
    }

  public expressLogError = () => (err: string, req: any, res: any, next: any) => {
      logger.error(`Express: ${err}`)
      next()
    }
}

const loggerFacet = new Logger()
export { Logger, loggerFacet as logger }
