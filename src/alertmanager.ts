// https://github.com/prometheus/alertmanager/blob/master/api/v2/openapi.yaml
import nodeFetch, { Headers } from 'node-fetch'
import { isJsonString } from './utils'

export class AlertManager {

  private readonly bAuthUser: string | boolean
  private readonly bAuthPass: string | boolean
  private readonly AM_URL: string
  private readonly AM_API_URL: string
  private headers: any

  constructor() {
    this.bAuthUser = process.env.AM_BASIC_AUTH_USER || false
    this.bAuthPass = process.env.AM_BASIC_AUTH_PASS || false
    if (!this.bAuthUser || !this.bAuthPass) {
      console.error('Please define the AM_BASIC_AUTH_USER and AM_BASIC_AUTH_PASS environment variables')
      process.exit(1)
    }

    this.headers = new Headers()
    this.headers.append('Authorization', `Basic ${Buffer.from(`${this.bAuthUser}:${this.bAuthPass}`).toString('base64')}`)

    this.AM_URL = process.env.AM_URL || 'https://am.idev-fsd.ml'
    this.AM_API_URL = `${this.AM_URL}/api/v2`
  }

  public getAlertmanagerAPI = async (endpoint: string) => {
    const options: any = { headers: this.headers }
    console.log('getAlertmanagerAPI fetch → ', `${this.AM_API_URL}/${endpoint}`)
    return await nodeFetch(`${this.AM_API_URL}/${endpoint}`, options)
      .then(res => res.json())
      .then(json => json)
      .catch(err => console.error(err))
  }

  public postAlertmanagerAPI = async (endpoint: string, body: any) => {
    const options: any = { headers: this.headers }
    options.method = 'post'
    options.body = JSON.stringify(body)
    options.headers.append('Content-Type', 'application/json')
    return await nodeFetch(`${this.AM_API_URL}/${endpoint}`, options)
      .then((res) => {
        console.log(`postAlertmanagerAPI status: ${res.status} (${res.statusText})`)
        if (res.size > 0 && res.ok && isJsonString(res.body)) {
          return res.json()
        }
        return res.text()
      })
      .then((body) => {
        console.log('body', body || 'is empty')
        return body || 'body is empty'
      })
      .catch(err => console.error(err))
  }

  public deleteAlertmanagerAPI = async (endpoint: string) => {
    const options: any = { headers: this.headers }
    options.method = 'delete'
    return await nodeFetch(`${this.AM_API_URL}/${endpoint}`, options)
      .then((res) => {
        console.log(`deleteAlertmanagerAPI status: ${res.status} (${res.statusText})`)
        return res.ok
      })
      .catch(err => console.error(err))
  }

  public filterWithFingerprint = async (fingerprint: string) => {
    const alertLists = await this.getAlertmanagerAPI('alerts')
    console.dir(alertLists.data)
    const alertListsMatched = alertLists.filter((el: { fingerprint: any }) =>  el.fingerprint === fingerprint)
    console.dir(alertListsMatched)
    return alertListsMatched
  }

}
