const PLATFORMS = [
    { key: 'all', name: '全平台', title: '视频文案提取工具', em: '一键视频转文本 · 秒级提取文案', desc: '支持视频号、抖音、小红书、快手、B 站、TikTok 和 YouTube。粘贴公开链接，一次拿到标题、描述、口播文案、封面和媒体地址。', placeholder: '粘贴视频链接或分享口令，开始提取文案...', card: '原始语言输出', cardDesc: '默认不翻译，直接返回标题、描述和口播原文。', action: '提取文案', legal: '使用即表示你确认拥有处理该内容的合法权限。公开链接解析结果仅用于当次展示，不保存原始视频。' },
    { key: 'weixin', name: '视频号', title: '视频号文案提取与解析下载', em: '一键提取口播文案 · 解析视频号素材', desc: '粘贴视频号分享链接，提取标题、描述、封面与视频直链，再识别口播文案。', placeholder: '粘贴视频号分享链接或口令，例如：https://channels.weixin.qq.com/xxxxx', card: '粘贴提取文案', cardDesc: '返回标题、正文、封面和媒体链接。', action: '解析提取', legal: '使用即表示你确认拥有处理该内容的合法权限。视频号解析只返回元数据与媒体地址，不存储、不分发原始视频。' },
    { key: 'douyin', name: '抖音', title: '抖音视频文案提取', em: '一键视频转文本 · 秒级提取文案', desc: '提取抖音视频标题、描述与封面。', placeholder: '粘贴抖音分享口令或链接，例如：https://v.douyin.com/xxxxx/', card: '原始语言输出', cardDesc: '默认不翻译，直接返回标题、描述和口播原文。', action: '提取文案', legal: '使用即表示你确认拥有处理该内容的合法权限。' },
    { key: 'xiaohongshu', name: '小红书', title: '小红书视频文案提取', em: '笔记标题、正文与封面', desc: '提取小红书笔记标题、正文与封面。', placeholder: '粘贴小红书笔记链接或分享短链', card: '原始语言输出', cardDesc: '图文笔记会列出图片，视频笔记可继续提取口播。', action: '提取文案', legal: '使用即表示你确认拥有处理该内容的合法权限。' },
    { key: 'kuaishou', name: '快手', title: '快手视频文案提取', em: '标题、描述与封面', desc: '提取快手视频标题、描述与封面。', placeholder: '粘贴快手分享口令或链接，例如：https://v.kuaishou.com/xxxxx', card: '原始语言输出', cardDesc: '默认不翻译，直接返回标题、描述和口播原文。', action: '提取文案', legal: '使用即表示你确认拥有处理该内容的合法权限。' },
    { key: 'bilibili', name: 'B站', title: 'B站视频文案提取', em: '标题、简介与封面', desc: '提取哔哩哔哩标题、简介与封面。', placeholder: '粘贴 B 站视频链接，例如：https://www.bilibili.com/video/BVxxxxx', card: '原始语言输出', cardDesc: '适合整理长视频文案素材。', action: '提取文案', legal: '使用即表示你确认拥有处理该内容的合法权限。' },
    { key: 'tiktok', name: 'TikTok', title: 'TikTok 文案提取', em: '标题、描述与封面', desc: '提取 TikTok 标题、描述与封面。', placeholder: 'Paste a TikTok link, e.g. https://www.tiktok.com/@user/video/xxxxx', card: '原始语言输出', cardDesc: '默认不翻译，直接返回原文。', action: '提取文案', legal: '使用即表示你确认拥有处理该内容的合法权限。' },
    { key: 'youtube', name: 'YouTube', title: 'YouTube 文案提取', em: '标题、简介与封面', desc: '提取 YouTube 标题、简介与封面。', placeholder: '粘贴 YouTube 链接，例如：https://www.youtube.com/watch?v=xxxxx', card: '原始语言输出', cardDesc: '默认不翻译，直接返回原文。', action: '提取文案', legal: '使用即表示你确认拥有处理该内容的合法权限。' }
]

const KEY = 'xiaobao.video-copy.key'
const HISTORY = 'xiaobao.video-copy.history'
const $ = (id) => document.getElementById(id)

let platform = 'all'
let busy = false

function current() {
    return PLATFORMS.find((item) => item.key === platform) || PLATFORMS[0]
}

function paintPlatform() {
    const item = current()
    $('hero-title').textContent = item.title
    $('hero-em').textContent = item.em
    $('hero-lead').textContent = item.desc
    $('card-title').textContent = item.card
    $('card-desc').textContent = item.cardDesc
    $('share').placeholder = item.placeholder
    $('submit').textContent = item.action
    $('legal').textContent = item.legal
    document.querySelectorAll('.platforms button').forEach((button) => {
        button.classList.toggle('is-active', button.dataset.key === platform)
    })
}

function readKey() {
    return localStorage.getItem(KEY) || ''
}

async function api(path, body) {
    const response = await fetch(path, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': readKey()
        },
        body: JSON.stringify(body)
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok || payload.ok === false) {
        throw new Error(payload.message || '请求失败')
    }
    return payload
}

function setBusy(on, title, text) {
    busy = on
    $('progress').hidden = !on
    $('studio').hidden = on || !$('workspace').hidden
    $('hero').hidden = on || !$('workspace').hidden
    $('submit').disabled = on
    if (title) $('progress-title').textContent = title
    if (text) $('progress-text').textContent = text
}

function count(n) {
    const value = Number(n) || 0
    if (value >= 10000) return `${(value / 10000).toFixed(1)}万`
    return String(value)
}

function escapeHtml(value) {
    return String(value || '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
}

function renderResult(result, speech) {
    const author = result.author?.name ? `作者 · ${result.author.name}` : ''
    const tags = [result.platform_label || result.platform, result.type, author].filter(Boolean)
    const stats = [
        ['点赞', result.stats?.like_count],
        ['评论', result.stats?.comment_count],
        ['转发', result.stats?.share_count],
        ['播放', result.stats?.play_count],
        ['收藏', result.stats?.collect_count]
    ].filter(([, value]) => Number(value) > 0)
    const media = result.video_url || result.audio_url
    $('workspace').hidden = false
    $('studio').hidden = true
    $('hero').hidden = true
    $('workspace').innerHTML = `
        <div class="tags">${tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div>
        <div class="work-grid">
            ${result.cover_url ? `<img class="cover" alt="" src="${escapeHtml(result.cover_url)}" />` : '<div class="cover"></div>'}
            <div>
                <h2>${escapeHtml(result.title || '未返回标题')}</h2>
                <p class="desc">${escapeHtml(result.desc || '')}</p>
                <p class="meta-line">${stats.map(([label, value]) => `${label} ${count(value)}`).join(' · ')}${result.stats?.publish_time ? ` · ${escapeHtml(result.stats.publish_time)}` : ''}</p>
                <div class="links">
                    ${result.videos.map((item) => `<a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.quality || '视频')} · 打开</a>`).join('')}
                    ${result.audio_url ? `<a href="${escapeHtml(result.audio_url)}" target="_blank" rel="noreferrer">音频 · 打开</a>` : ''}
                </div>
                ${result.images?.length ? `<div class="gallery">${result.images.slice(0, 8).map((url) => `<img alt="" src="${escapeHtml(url)}" />`).join('')}</div>` : ''}
            </div>
        </div>
        <div class="speech" id="speech">${speech ? escapeHtml(speech) : '还没有口播文案。有视频或音频地址时可以继续提取。'}</div>
        <div class="result-actions">
            <button type="button" class="ghost" id="again">再解析一条</button>
            <button type="button" class="ghost" id="copy-text" ${speech ? '' : 'disabled'}>复制文案</button>
            <button type="button" class="cta" id="extract" ${media ? '' : 'disabled'}>提取口播文案</button>
        </div>
        <p class="notice">${escapeHtml(result.source?.copyright_notice || '')} ${escapeHtml(result.source?.usage_restriction || '')}</p>
    `
    $('again').onclick = reset
    $('copy-text').onclick = () => navigator.clipboard.writeText(speech || '')
    $('extract').onclick = () => extractSpeech(result)
}

function reset() {
    $('workspace').hidden = true
    $('workspace').innerHTML = ''
    $('studio').hidden = false
    $('hero').hidden = false
    $('share').value = ''
}

function remember(url, result) {
    const list = JSON.parse(localStorage.getItem(HISTORY) || '[]')
    list.unshift({
        url,
        title: result.title || result.platform_label || '未命名',
        platform: result.platform_label || result.platform,
        at: Date.now()
    })
    localStorage.setItem(HISTORY, JSON.stringify(list.slice(0, 20)))
}

async function parseShare() {
    const url = $('share').value.trim()
    if (!url || busy) return
    document.querySelector('.error')?.remove()
    if (!readKey()) {
        $('key-dialog').showModal()
        return
    }
    setBusy(true, platform === 'weixin' ? '正在解析视频号内容' : '正在解析链接', '正在获取标题、封面和媒体地址')
    try {
        const payload = await api('/api/parse', { url, platform })
        remember(url, payload.result)
        renderResult(payload.result, '')
    } catch (error) {
        showError(error.message)
    } finally {
        setBusy(false)
    }
}

function showError(message) {
    let node = document.querySelector('.error')
    if (!node) {
        node = document.createElement('p')
        node.className = 'error'
        $('studio').append(node)
    }
    node.textContent = message
}

async function extractSpeech(result) {
    const content = result.video_url || result.audio_url
    if (!content || busy) return
    setBusy(true, '正在提取口播文案', '文案接口是异步的，完成后会回到这条结果')
    $('workspace').hidden = true
    try {
        let taskId = ''
        let text = ''
        for (let i = 0; i < 120; i += 1) {
            const payload = await api('/api/text', taskId ? { taskId } : { content })
            const row = payload.result
            if (row.status === 'completed' && row.text) {
                text = row.text
                break
            }
            taskId = row.task_id || taskId
            if (!taskId) throw new Error(row.message || '没有拿到文案任务号')
            $('progress-text').textContent = row.message || '正在识别口播，请稍候'
            await new Promise((resolve) => setTimeout(resolve, 3000))
        }
        if (!text) throw new Error('文案还在处理，请稍后再试')
        renderResult(result, text)
    } catch (error) {
        renderResult(result, '')
        const speech = $('speech')
        if (speech) speech.textContent = error.message
    } finally {
        setBusy(false)
        $('workspace').hidden = false
        $('studio').hidden = true
        $('hero').hidden = true
    }
}

function bind() {
    const nav = $('platforms')
    for (const item of PLATFORMS) {
        const button = document.createElement('button')
        button.type = 'button'
        button.dataset.key = item.key
        button.textContent = item.name
        button.onclick = () => {
            platform = item.key
            paintPlatform()
        }
        nav.append(button)
    }
    paintPlatform()
    $('submit').onclick = parseShare
    $('share').addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            parseShare()
        }
    })
    $('paste').onclick = async () => {
        const text = await navigator.clipboard.readText()
        $('share').value = text
    }
    $('open-key').onclick = () => {
        $('key-input').value = readKey()
        $('key-dialog').showModal()
    }
    $('key-save').onclick = () => {
        localStorage.setItem(KEY, $('key-input').value.trim())
    }
    $('key-clear').onclick = () => {
        localStorage.removeItem(KEY)
        $('key-input').value = ''
    }
    $('open-history').onclick = () => {
        const list = JSON.parse(localStorage.getItem(HISTORY) || '[]')
        $('history-list').innerHTML = list.length
            ? list.map((item, index) => `<button type="button" data-index="${index}"><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.platform || '')}</small></button>`).join('')
            : '<p>还没有记录。解析成功后会留在这台浏览器里。</p>'
        $('history-list').querySelectorAll('button').forEach((button) => {
            button.onclick = () => {
                const item = list[Number(button.dataset.index)]
                $('share').value = item.url
                $('history-dialog').close()
            }
        })
        $('history-dialog').showModal()
    }
    $('history-clear').onclick = () => {
        localStorage.removeItem(HISTORY)
        $('history-list').innerHTML = '<p>已清空。</p>'
    }
}

bind()
