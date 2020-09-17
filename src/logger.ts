import winston from 'winston'
const { combine, timestamp, printf } = winston.format

class Logger {

  logger: winston.Logger

  constructor() {

    const options: any = {
      console: {
        level: 'debug',
        handleExceptions: true,
        json: false,
        colorize: true,
      },
    }

    const logFormat = printf(({ level, message, timestamp }) => {
      return `${timestamp} ${level}: ${message}`
    })

    this.logger = winston.createLogger({
      format: combine(
        winston.format.colorize(),
        timestamp(),
        logFormat,
      ),
      transports: [new winston.transports.Console(options.console)],
    })
  }

  public expressAppLogger = () => {
    return (req: any, res: any, next: any) => {
      this.logger.info(
        `${req.ip} ${req.method} ${req.url} (user-agent: ${req.get('user-agent')})`,
      )
      this.logger.debug(
        // see https://expressjs.com/en/api.html#req
        `${req.ip} ${req.method} ${req.url} ${req.path} ${req.originalUrl} ${req.baseUrl} (user-agent: ${req.get('user-agent')})\n${req.body}`,
      )
      next()
    }
  }

  public expressLogError = () => {
    return (err: string, req: any, res: any, next: any) => {
      this.logger.error(err)
      next()
    }
  }

}

export {
  Logger,
}
