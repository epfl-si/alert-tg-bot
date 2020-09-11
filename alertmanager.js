/**
 * This file handle the request to the alertmanager
 */
const fetch = require('node-fetch')
const bAuthUser = process.env.AM_BASIC_AUTH_USER || false
const bAuthPass = process.env.AM_BASIC_AUTH_PASS || false

if (!bAuthUser || !bAuthPass) {
  console.error('Please define the AM_BASIC_AUTH_USER and AM_BASIC_AUTH_PASS environment variables')
  process.exit(1)
}
const options = { headers: { Authorization: 'Basic ' + Buffer.from(`${bAuthUser}:${bAuthPass}`).toString('base64') } }
const AM_URL = process.env.AM_URL + '/api/v2' || 'https://am.idev-fsd.ml/api/v2'

const getAlertmanagerAPI = async (endpoint) => {
  return await fetch(`${AM_URL}/${endpoint}`, options)
    .then((res) => res.json())
    .then((json) => json)
}

// async function init() {
//   console.log(await getAlertmanagerAPI('status'))
//   console.log(await getAlertmanagerAPI('silence'))
// }
// init()
module.exports.getAlertmanagerAPI = getAlertmanagerAPI
