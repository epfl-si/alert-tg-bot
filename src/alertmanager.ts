import moment from 'moment'
import nodeFetch, { Headers } from 'node-fetch'
const bAuthUser: string | boolean = process.env.AM_BASIC_AUTH_USER || false
const bAuthPass: string | boolean = process.env.AM_BASIC_AUTH_PASS || false

if (!bAuthUser || !bAuthPass) {
  console.error('Please define the AM_BASIC_AUTH_USER and AM_BASIC_AUTH_PASS environment variables')
  process.exit(1)
}
const headers: any = new Headers()
headers.append('Authorization', `Basic ${Buffer.from(`${bAuthUser}:${bAuthPass}`).toString('base64')}`)
const options: any = { headers }
const AM_URL: string = process.env.AM_URL || 'https://am.idev-fsd.ml'
const AM_API_URL: string = `${AM_URL}/api/v2`

const getAlertmanagerAPI = async (endpoint: string) => {
  return await nodeFetch(`${AM_API_URL}/${endpoint}`, options)
    .then(res => res.json())
    .then(json => json)
}

const postAlertmanagerAPI = async (endpoint: string, body: string) => {
  options.method = 'post'
  options.body = JSON.stringify(body)
  options.headers.append('Content-Type', 'application/json')
  // console.log(options)
  return await nodeFetch(`${AM_API_URL}/${endpoint}`, options)
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

// https://stackoverflow.com/a/31881889/960623
const isJsonString = (text: any) => {
  if (typeof text !== 'string') {
    return false
  }
  try {
    JSON.parse(text)
    return true
  } catch (error) {
    return false
  }
}

const postTestAlert = async () => {
  const data: any = {
    receiver: 'alert-tg-bot',
    status: 'firing',
    alerts: [
      {
        status: 'firing',
        labels: {
          alertname: 'Fire_2',
          severity: 'critical',
          sendto: 'telegram',
        },
        annotations: {
          message: 'Something is on fire_2',
          description: 'Something is on fire_2',
          summary: 'Something is on fire_2',
        },
        startsAt: `${moment().toISOString()}`, // 2020-09-13T16:09:40.449Z
        endsAt: `${moment().add(5, 'hours').toISOString()}`, // + 5 hours
      },
    ],
    groupLabels: {
      alertname: 'Fire_2',
    },
    commonLabels: {
      alertname: 'Fire_2',
      severity: 'critical',
    },
    commonAnnotations: {
      message: 'Something is on fire_2',
    },
    externalURL: AM_URL,
    version: '4',
    groupKey: '{}:{alertname="Fire_2"}',
  }

  // --data '[{"labels":{"alertname":"TestAlert1"}}]'
  console.log(
    `curl -i --header "Content-Type: application/json" --header "Authorization: Basic ${Buffer.from(`${bAuthUser}:${bAuthPass}`).toString(
      'base64',
    )}" --request POST --data '${JSON.stringify(data.alerts)}' ${AM_API_URL}/alerts`,
  )
  return await postAlertmanagerAPI('alerts', data.alerts)
}

export { getAlertmanagerAPI, postAlertmanagerAPI, postTestAlert }

const init = () => {
  postTestAlert()
}
init()
