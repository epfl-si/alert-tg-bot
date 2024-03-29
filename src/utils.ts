import JavascriptTimeAgo from 'javascript-time-ago'
import en from 'javascript-time-ago/locale/en'

/**
 * Test if a string is a valid JSON or not
 * https://stackoverflow.com/a/31881889/960623
 */
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

/**
 * Return a human duration, e.g. in 50 minutes,
 * based on now() <-> eventDate1.
 */
const humanizeDuration = (eventDate1: Date) => {
  JavascriptTimeAgo.addLocale(en as any)
  const timeAgo = new JavascriptTimeAgo('en-US')
  return timeAgo.format(eventDate1.getTime(), 'time' as any)
}

/**
 * Validate a Telegram Group or Chat ID.
 * Note that it can starts with a `-`, meaning that it's a group.
 */
const validateGroupOrChatID = (id: string) => {
  const re = new RegExp(/^[-]?[\d]{6,20}$/)
  return id.match(re)
}

/**
 * Return the input array spliced into smaller array.
 */
const spliceArray = (inputArray: any[]) => {
  const outputArray: any[] = []
  while (inputArray.length) {
    outputArray.push(inputArray.splice(0, 2))
  }
  return outputArray
}

export {
 humanizeDuration, isJsonString, spliceArray, validateGroupOrChatID
}
