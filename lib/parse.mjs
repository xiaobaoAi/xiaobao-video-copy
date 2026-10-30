export const DEFAULT_BASE = 'https://xiaoapis.com'

const WEIXIN_HOST =
    /channels\.weixin\.qq\.com|finder\.video\.qq\.com|mp\.weixin\.qq\.com|weixin\.qq\.com\/sph/i

export function looksLikeWeixin(input, platform = '') {
    if (platform === 'weixin') return true
    return WEIXIN_HOST.test(String(input || ''))
}

export function endpointFor(input, platform = '') {
    return looksLikeWeixin(input, platform)
        ? '/api/video/weixin'
        : '/api/video/videoparse'
}

function asText(value) {
    if (value == null) return ''
    if (typeof value === 'string' || typeof value === 'number') return String(value).trim()
    return ''
}

function asCount(value) {
    const n = Number(value)
    return Number.isFinite(n) ? n : 0
}

function authorFrom(data) {
    const author = data.author
    if (author && typeof author === 'object') {
        return {
            name: asText(author.name || data.author_name),
            id: asText(author.id || data.author_id),
            avatar: asText(author.avatar || data.author_avatar),
            account: asText(author.account || data.author_account)
        }
    }
    return {
        name: asText(author || data.author_name || data.stats?.author_name),
        id: asText(data.author_id || data.stats?.author_id),
        avatar: asText(data.author_avatar || data.stats?.author_avatar),
        account: asText(data.author_account || data.stats?.author_account)
    }
}

function videosFrom(data) {
    const list = []
    const primary = asText(data.video_url)
    if (primary) {
        list.push({
            quality: asText(data.quality) || '默认',
            url: primary,
            format: asText(data.video_format),
            resolution: ''
        })
    }
    const extras = []
        .concat(Array.isArray(data.video_list) ? data.video_list : [])
        .concat(Array.isArray(data.video_backup) ? data.video_backup : [])
    for (const item of extras) {
        if (!item || typeof item !== 'object') continue
        const url = asText(item.url || item.fileUrl)
        if (!url || list.some((row) => row.url === url)) continue
        list.push({
            quality: asText(item.quality || item.label) || '备选',
            url,
            format: asText(item.format),
            resolution: asText(item.resolution)
        })
    }
    return list
}

export function normalizeParse(raw, sourceUrl) {
    const data = raw && typeof raw.data === 'object' && raw.data ? raw.data : {}
    const stats = data.stats && typeof data.stats === 'object' ? data.stats : {}
    const source = data.source && typeof data.source === 'object' ? data.source : {}
    const images = []
        .concat(Array.isArray(data.images) ? data.images : [])
        .concat(Array.isArray(data.imagelist) ? data.imagelist : [])
        .map((item) => (typeof item === 'string' ? item.trim() : asText(item?.url)))
        .filter(Boolean)
    const uniqueImages = [...new Set(images)]
    const author = authorFrom(data)
    const videos = videosFrom(data)
    return {
        platform: asText(data.platform || source.platform),
        platform_label: asText(source.platform_label),
        type: asText(data.type),
        title: asText(data.title),
        desc: asText(data.desc || data.videoDesc),
        cover_url: asText(data.cover_url),
        audio_url: asText(data.audio_url),
        video_url: videos[0]?.url || '',
        videos,
        images: uniqueImages,
        author,
        stats: {
            like_count: asCount(stats.like_count),
            comment_count: asCount(stats.comment_count),
            share_count: asCount(stats.share_count),
            play_count: asCount(stats.play_count),
            collect_count: asCount(stats.collect_count),
            publish_time: asText(stats.publish_time)
        },
        request_url: asText(data.request_url) || sourceUrl,
        source: {
            original_url: asText(source.original_url) || sourceUrl,
            copyright_notice:
                asText(source.copyright_notice) ||
                '本内容版权归原作者及原平台所有。本服务只解析链接，不存储、不复制、不分发原始内容。',
            usage_restriction:
                asText(source.usage_restriction) ||
                '仅供你有权使用的内容做备份、审核、分析或研究。不要公开传播他人作品，也不要做成下载站。'
        }
    }
}

export function assertApiOk(payload) {
    const code = Number(payload?.code)
    const msg = asText(payload?.msg || payload?.message)
    if (code === 200 || code === 0 || code === 1) return payload
    const error = new Error(msg || '解析失败')
    error.code = Number.isFinite(code) ? code : 500
    throw error
}

function pickTaskId(data, root) {
    const bags = [data, root]
    for (const bag of bags) {
        if (!bag || typeof bag !== 'object') continue
        for (const [key, value] of Object.entries(bag)) {
            if (key.toLowerCase() !== 'taskid' && key !== 'task_id') continue
            const id = asText(value)
            if (id) return id
        }
    }
    return ''
}

function pickText(data) {
    if (!data || typeof data !== 'object') return ''
    return asText(data.resultText || data.result_text || data.text)
}

const DONE = new Set(['completed', 'success', 'done', 'finish', 'finished'])
const FAIL = new Set(['failed', 'fail', 'error', 'cancelled', 'canceled'])

export function normalizeText(payload) {
    const data = payload && typeof payload.data === 'object' && payload.data ? payload.data : {}
    const status = asText(data.status || payload?.status).toLowerCase()
    const text = pickText(data) || pickText(payload)
    const taskId = pickTaskId(data, payload)
    if (FAIL.has(status)) {
        const error = new Error(asText(payload?.msg) || '文案提取失败')
        error.code = 400
        throw error
    }
    const completed = Boolean(text) && (DONE.has(status) || status === '' || !taskId)
    return {
        status: completed ? 'completed' : 'processing',
        task_id: taskId,
        text,
        author: asText(data.author),
        duration: data.duration ?? '',
        video_desc: asText(data.videoDesc || data.video_desc),
        message: asText(payload?.msg)
    }
}
