/**
 * This file handle the request to the alertmanager
 */
const fetch = require('node-fetch')
const { Headers } = require('node-fetch')
const moment = require('moment')

const bAuthUser = process.env.AM_BASIC_AUTH_USER || false
const bAuthPass = process.env.AM_BASIC_AUTH_PASS || false

if (!bAuthUser || !bAuthPass) {
  console.error('Please define the AM_BASIC_AUTH_USER and AM_BASIC_AUTH_PASS environment variables')
  process.exit(1)
}
let headers = new Headers()
headers.append('Authorization', 'Basic ' + Buffer.from(bAuthUser + ':' + bAuthPass).toString('base64'))
const options = { headers }
const AM_URL = process.env.AM_URL || 'https://am.idev-fsd.ml'
const AM_API_URL = AM_URL + '/api/v2'

const getAlertmanagerAPI = async (endpoint) => {
  return await fetch(`${AM_API_URL}/${endpoint}`, options)
    .then((res) => res.json())
    .then((json) => json)
}

const postAlertmanagerAPI = async (endpoint, body) => {
  options.method = 'post'
  options.body = JSON.stringify(body)
  options.headers.append('Content-Type', 'application/json')
  console.log(options)
  return await fetch(`${AM_API_URL}/${endpoint}`, options)
    .then((res) => res.json())
    .then((json) => json)
}

const postTestAlert = async () => {
  /* 
    curl \
    --request POST \
    --data '{"receiver":"telegram","status":"firing","alerts":[{"status":"firing","labels":{"alertname":"Fire","severity":"critical"},"annotations":{"message":"Something is on fire"},"startsAt":"2018-11-04T22:43:58.283995108+01:00","endsAt":"2018-11-04T22:46:58.283995108+01:00","generatorURL":"http://localhost:9090/graph?g0.expr=vector%28666%29\u0026g0.tab=1"}],"groupLabels":{"alertname":"Fire"},"commonLabels":{"alertname":"Fire","severity":"critical"},"commonAnnotations":{"message":"Something is on fire"},"externalURL":"http://localhost:9093","version":"4","groupKey":"{}:{alertname=\"Fire\"}"}' \
    localhost:8080
  */
  data = {
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
        },
        startsAt: `${moment().toISOString()}`, // 2020-09-13T16:09:40.449Z
        endsAt: `${moment().add(5, 'hours').toISOString()}` // + 5 hours
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
  console.log(`curl --header "Content-Type: application/json" --header "Authorization: Basic ${Buffer.from(bAuthUser + ':' + bAuthPass).toString('base64')}" --request POST  --data '${JSON.stringify(data.alerts)}'  ${AM_API_URL}/alerts`)
  await postAlertmanagerAPI('/alerts', data.alerts)
}

const init = async () => {
  await postTestAlert()
}
init()
module.exports.getAlertmanagerAPI = getAlertmanagerAPI
module.exports.postAlertmanagerAPI = postAlertmanagerAPI
module.exports.postTestAlert = postTestAlert
