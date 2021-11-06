const needle = require('needle')
const fs = require('fs')
const db = require('./db')

const headers = {
    'authority': 'www.youtube.com',
    'cache-control': 'max-age=0',
    'sec-ch-ua': '"Google Chrome";v="95", "Chromium";v="95", ";Not A Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-full-version': '"95.0.4638.69"',
    'sec-ch-ua-arch': '"x86"',
    'sec-ch-ua-platform': '"Windows"',
    'sec-ch-ua-platform-version': '"10.0.0"',
    'sec-ch-ua-model': '""',
    'sec-ch-ua-bitness': '"64"',
    'upgrade-insecure-requests': '1',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36',
    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
    'service-worker-navigation-preload': 'true',
    'sec-fetch-site': 'same-origin',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-user': '?1',
    'sec-fetch-dest': 'document',
    'accept-language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7,bg;q=0.6,la;q=0.5',
    'x-client-data': 'qbi1yQEIieeVEQiitsbeqMG2yQEIq13KEQVDFqoeqOvyywEIF/LLEQie+qseqOEE1EEI+YTMEQi2hqweqP+F1EEIy4nMEQi1i9weqLeLzEE='
}

const BASE_URL = 'https://www.youtube.com'

const statisctics = {
    trendChannel: 0,
    videosFromTrendChannel: 0,
    videosInDepth_1: 0,
    videosInDepth_2: 0,
    // videosInDepth_3: 0,
    // videosInDepth_4: 0,
    // videosInDepth_5: 0,
    videosExist: 0
}

async function fetchPage(url) {
    const result = await needle('get', url, { headers })

    let randomDelay = Math.random() * 1000
    if (randomDelay < 200) {
        randomDelay += 200
    }

    await new Promise(res => setTimeout(res, randomDelay))
    return result.body
}

async function getTrendPage() {
    let workingDoc

    try {
        if (fs.existsSync((__dirname + '/data.txt'))) {
            const exist = fs.readFileSync(__dirname + '/data.txt')
            workingDoc = exist.toString()
            console.log('exist')
        } else {
            const result = await fetchPage('https://www.youtube.com/feed/explore')
            fs.writeFileSync('data.txt', result)
            workingDoc = result
        }
    } catch (err) {
        console.error(err)
        throw err
    }
    // const exist = 
    // if (!exist) {

    // } else {

    // }
    return workingDoc
}
function findInDocument(document, startString, endString, reverse = false) {
    let index = 0
    let foundSet = new Set()

    if (!reverse) {
        while (index != -1) {
            index = document.indexOf(startString, index + 1)
            let index2 = document.indexOf(endString, index + 1)
            const foundString = document.slice(index, index2 + endString.length)
            if (foundString) {
                foundSet.add(foundString)
            }
        }
        return [...foundSet]
    } else {
        const searchLength = endString.length
        let index = document.indexOf(endString)
        let index2 = document.lastIndexOf(startString, index + 1)

        const rawSubscribers = document.slice(index2, index + searchLength)
        return rawSubscribers
    }

}
function parseUrl(rawString) {
    const parsed = JSON.parse(rawString)
    return parsed.url
}
function getTrendingChannels(workingDoc) {
    const channelSet = findInDocument(workingDoc, '{"url":"/c/', '}')
    const urlArray = []
    for (const channelRaw of channelSet) {
        const path = parseUrl(channelRaw)
        const url = BASE_URL + path
        urlArray.push(url)
    }
    return urlArray
}

function parseChannelSubscribersFromChannel(document) {
    const rawSubscribers = findInDocument(document, '{', 'подписчиков"}', true)
    return JSON.parse(rawSubscribers).label
}


async function goToChannel(channelUri) {
    let result = await fetchPage(channelUri)

    const subscribers = parseChannelSubscribersFromChannel(result)
    const videos = parseVideos(result).urlArray
    return { subscribers, videos }
}
function dropAfterFirstQuery(path) {
    // let afterQueryExist = 
    return path.slice(0, path.indexOf('&') === -1 ? path.length : path.indexOf('&'))
}

function parseChannelSubscribersFromVideo(rawData) {
    try {
        const subscribersRaw = JSON.parse('{' + rawData + '}}')
        return subscribersRaw.subscriberCountText.accessibility.accessibilityData.label
    } catch (e) {
        console.log(e, rawData)
        return 'NO DATA'
    }
}
function parseChannelLinkFromVideo(rawData) {
    try {
        const subscribersRaw = JSON.parse('{"' + rawData + '":null } } }')
        // console.log(subscribersRaw.navigationEndpoint.commandMetadata.webCommandMetadata.url)
        return BASE_URL + subscribersRaw.navigationEndpoint.commandMetadata.webCommandMetadata.url
    } catch (e) {
        console.log(e, rawData)
        return 'NO DATA'
    }
}
function parseVideoNameFromVideo(rawData) {
    return rawData.replace('<title>', '').replace(' - YouTube</title>', '')
}

function parseChannelNameFromVideo(rawData) {
    try {
        let channelNameRaw = findInDocument(rawData, 'title":{"runs":[{"', 'navigationEndpoint')[0]
        channelNameRaw = channelNameRaw.replace('title":{"runs":[{"text":"', '').replace('","navigationEndpoint', '')
        return channelNameRaw
    } catch (e) {
        console.log(e, rawData)
        return 'NO DATA'
    }
}
function parseVideoViewsFromVideo(rawData) {
    try {
        const videoViewsRaw = findInDocument(rawData, '{"viewCount":{"simpleText":"', '"},"shortViewCount"')[0]
        videoViews = videoViewsRaw.replace('{"viewCount":{"simpleText":"', '').replace('"},"shortViewCount"', '')
        return videoViews
    } catch (e) {
        console.log(e, rawData)
        return 'NO DATA'
    }
}

function parseVideos(document, fromVideo) {

    const rawVideosSet = findInDocument(document, '{"url":"/watch?v=', '}')
    const videoNameRaw = findInDocument(document, '<title>', '</title>')
    const videoName = parseVideoNameFromVideo(videoNameRaw[0])

    let channelSubscribers, channelLink, channelName, videoViews
    if (fromVideo) {
        const channelSubscribersCountRaw = findInDocument(document, '"subscriberCountText', '}}')
        channelSubscribers = parseChannelSubscribersFromVideo(channelSubscribersCountRaw[0])

        const channelLinkRaw = findInDocument(document, 'subscriptionButton', 'canonicalBaseUrl')
        channelLink = parseChannelLinkFromVideo(channelLinkRaw[0])

        const channelNameRaw = findInDocument(document, '"title":{"runs":[{"text":', 'subscriberCountText', true)
        channelName = parseChannelNameFromVideo(channelNameRaw)
        //videoPrimaryInfoRenderer videoActions
        const videoViewsRaw = findInDocument(document, 'videoPrimaryInfoRenderer', 'videoActions')
        videoViews = parseVideoViewsFromVideo(videoViewsRaw[0])

    }

    //"canonicalBaseUrl":"/channel/UClUnHqJSCpMU1V12LIq_9ug"}}}]},"subscriptionButton":


    // console.log(1, channelSubscribers, 2, channelLink, videoName, channelName)
    // console.log(videoName);

    const urlArray = []
    for (const rawVideo of rawVideosSet) {
        let path = parseUrl(rawVideo)
        path = dropAfterFirstQuery(path)

        const url = BASE_URL + path
        urlArray.push(url)
    }
    return { urlArray, videoName, channelSubscribers, channelLink, channelName, videoViews }
}
const videoObj = {}
let counter = 0
async function goToVideo(videoUri, depth) {
    console.log(statisctics)
    const exist = await db.collection('parsedVideos').findOne({ videoUri })
    if (exist) {
        statisctics.videosExist++
        // console.log('exist', videoUri, depth, counter++, exist.videoName)
        return
    }
    statisctics[`videosInDepth_${depth}`]++
    // console.log(statisctics)
    const result = await fetchPage(videoUri)
    // console.log(videoUri)
    const { urlArray, videoName, channelSubscribers, channelLink, channelName, videoViews } = parseVideos(result, true)

    // console.log({ videoName, videoViews, channelSubscribers, channelLink, channelName, })
    await saveVideoAndChannel({ videoName, channelSubscribers, channelLink, channelName, videoUri, videoViews })
    // await db.collection('parsedVideos').insertOne({ videoUri, videoName: [...videoName][0], depth })
    for (let i = 0; i < urlArray.length; i++) {
        if (depth < 2) {
            // console.log(urlArray.length)
            await goToVideo(urlArray[i], depth + 1)
        }
    }
}

async function saveVideoAndChannel({ videoName, channelSubscribers, channelLink, channelName, videoUri }) {
    // let channel = await db.collection('parsedChannels').findOne({channelLink}, {$set:{channelSubscribers, channelLink, channelName}}, {upsert: true})
    let channel = await db.collection('parsedChannels').findOne({ channelLink })
    if (!channel) {
        channel = await db.collection('parsedChannels').insertOne({ channelSubscribers, channelLink, channelName })
    }
    // console.log(channel)
    await db.collection('parsedVideos').insertOne({ videoName, videoViews, videoUri, channelId: channel._id || channel.insertedId })

}


async function main() {

    const workingDocumet = await getTrendPage()
    const trendChannelsUris = getTrendingChannels(workingDocumet)
    // console.log(trendChannelsUris);

    for (let channelUri of trendChannelsUris) {
        const { subscribers, videos } = await goToChannel(channelUri)
        // console.log('videos', videos)
        statisctics.trendChannel++
        for (let video of videos) {
            statisctics.videosFromTrendChannel++
            await goToVideo(video, 1)
            // break
        }
        // break

    }
    console.log('alldone')
    process.exit(0)
    // console.log(setIterator.next().value)
}


//todo go to related videos +  go to comments, open channels, recursive with depth
main()

