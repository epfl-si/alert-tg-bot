// https://github.com/prometheus/alertmanager/blob/master/api/v2/openapi.yaml
import nodeFetch from 'node-fetch'
import { Headers } from 'node-fetch'
import { isJsonString } from './utils'
import { logger } from './logger'

export default class AlertManager {
  private readonly bAuthUser: string | boolean

  private readonly bAuthPass: string | boolean

  private readonly AM_URL: string

  private readonly AM_API_URL: string

  private headers: any

  constructor() {
    this.bAuthUser = process.env.AM_BASIC_AUTH_USER || false
    this.bAuthPass = process.env.AM_BASIC_AUTH_PASS || false
    if (!this.bAuthUser || !this.bAuthPass) {
      logger.error(
        'Please define the AM_BASIC_AUTH_USER and AM_BASIC_AUTH_PASS environment variables'
      )
      process.exit(1)
    }

    this.headers = new Headers()
    this.headers.append(
      'Authorization',
      `Basic ${Buffer.from(`${this.bAuthUser}:${this.bAuthPass}`).toString('base64')}`
    )

    this.AM_URL = process.env.AM_URL || 'https://am.idev-fsd.ml'
    this.AM_API_URL = `${this.AM_URL}/api/v2`
  }

  public getAlertmanagerURL = (): string => this.AM_URL

  public getAlertmanagerAPIURL = (): string => this.AM_API_URL

  public getAlertmanagerAPI = async (endpoint: string) => {
    const options: any = { headers: this.headers }
    logger.info(`getAlertmanagerAPI fetch ${this.AM_API_URL}/${endpoint}`)
    return nodeFetch(`${this.AM_API_URL}/${endpoint}`, options)
      .then((res: any) => res.json())
      .then((json: string) => json)
      .catch((err: any) => logger.error(err))
  }

  public postAlertmanagerAPI = async (endpoint: string, body: any) => {
    const options: any = { headers: this.headers }
    options.method = 'post'
    options.body = JSON.stringify(body)
    options.headers.append('Content-Type', 'application/json')
    return nodeFetch(`${this.AM_API_URL}/${endpoint}`, options)
      .then((res: { status: any; statusText: any; size: number; ok: any; body: any; json: () => any; text: () => any; }) => {
        logger.info(`postAlertmanagerAPI status: ${res.status} (${res.statusText})`)
        if (res.size > 0 && res.ok && isJsonString(res.body)) {
          return res.json()
        }
        return res.text()
      })
      .then((_body: any) => _body || 'body is empty')
      .catch((err: any) => logger.error(err))
  }

  public deleteAlertmanagerAPI = async (endpoint: string) => {
    const options: any = { headers: this.headers }
    options.method = 'delete'
    return nodeFetch(`${this.AM_API_URL}/${endpoint}`, options)
      .then((res: { status: any; statusText: any; ok: any; }) => {
        logger.info(`deleteAlertmanagerAPI status: ${res.status} (${res.statusText})`)
        return res.ok
      })
      .catch((err: any) => logger.error(err))
  }

  public filterWithFingerprint = async (fingerprint: string) => {
    const alertLists:any= await this.getAlertmanagerAPI('alerts')
    const alertListsMatched = alertLists.filter(
      (el: { fingerprint: any }) => el.fingerprint === fingerprint
    )
    return alertListsMatched
  }
}
