import winston from 'winston'
const { combine, timestamp, printf } = winston.format

class Logger {

  logger:() => winston.Logger

  private static loggerSingleton?: winston.Logger

  constructor() {

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
    // TODO: share between instances
    let logger: winston.Logger
    if (! Logger.loggerSingleton) {
      logger = Logger.loggerSingleton = winston.createLogger({
        format: combine(
          winston.format.colorize(),
          timestamp(),
          logFormat,
        ),
        transports: [new winston.transports.Console(options.console)],
      })
    } else {
      logger = Logger.loggerSingleton
    }
    this.logger = () => logger
  }

  public error(param: any) {
    this.logger().error(param)
  }

  public info(param: any) {
    this.logger().info(param)
  }

  public debug(param: any) {
    this.logger().debug(param)
  }

  public expressAppLogger = () => {
    return (req: any, res: any, next: any) => {
      this.logger().info(
        `${req.ip} ${req.method} ${req.url} (user-agent: ${req.get('user-agent')})`,
      )
      this.logger().debug(
        // see https://expressjs.com/en/api.html#req
        `${req.ip} ${req.method} ${req.url} ${req.path} ${req.originalUrl} ${req.baseUrl} (user-agent: ${req.get('user-agent')})\n${req.body}`,
      )
      next()
    }
  }

  public expressLogError = () => {
    return (err: string, req: any, res: any, next: any) => {
      this.logger().error(err)
      next()
    }
  }

}

const logger = new Logger()

export {
  Logger,
  logger,
}
