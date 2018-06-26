const request = require('4k/request')
const fs = require('fs')
const parser = require('xml2js')

// promisify xml2js
const parseXML = str => new Promise((s, f) => parser
  .parseString(str, {trim: true}, (err, result) => err ? f(err) : s(result)))

// return an object of one property where the value is the value
// of the first element of the property array from the source
// or undefined if the value does not exist
const setIfExists = (key, src) => ({ [key]: src[key] && src[key][0] })
// ('b', { b: [5] }) => { b: 5 }
// ('c', { b: [5] }) => { c: undefined }

const parseItem = item => ({
  ...setIfExists('title', item),
  ...setIfExists('link', item),
  ...setIfExists('description', item),
  ...setIfExists('category', item),
  ...setIfExists('pubDate', item),
  ...item.enclosure[0].$
})

const parseChannel = channel => ({
  ...setIfExists('title', channel),
  ...setIfExists('link', channel),
  ...setIfExists('description', channel),
  ...setIfExists('language', channel),
  ...setIfExists('copyright', channel),
  ...setIfExists('lastBuildDate', channel),
  ...setIfExists('generator', channel),
  image: channel.image && channel.image[0].$,
  items: channel.item.map(parseItem)
})

const urls = [
  'http://radiofrance-podcast.net/podcast09/rss_18875.xml',
  'https://www.npr.org/rss/podcast.php?id=510311',
  'https://feeds.podtrac.com/IDG2gabM8Gsg'
]

Promise.all(urls.map(request)) // Download all xml feed
  .then(async (xml) => {
    const data = (await Promise.all(xml.map(parseXML))) // Parse in XML
      .map(({ rss }) => rss.channel.map(parseChannel)) // Parse channel data
      .reduce((a, b) => a.concat(b), []) // flatten the array:
      /// [ [1], [2], [3, 4] ] -> [1, 2, 3, 4]

    // save file in JSON
    await fs.promises.writeFile('data.json', JSON.stringify(data, null, 2), 'utf8')
  })
  .catch(console.error) // log errors :]
