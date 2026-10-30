import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
    DEFAULT_BASE,
    assertApiOk,
    endpointFor,
    normalizeParse,
    normalizeText
} from './lib/parse.mjs'

const root = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.join(root, 'public')
const port = Number(process.env.PORT || 8787)
const baseUrl = String(process.env.XIAOBAO_BASE_URL || DEFAULT_BASE).replace(/\/+$/, '')

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.json': 'application/json; charset=utf-8'
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = []
        req.on('data', (chunk) => chunks.push(chunk))
        req.on('end', () => {
            const raw = Buffer.concat(chunks).toString('utf8')
            if (!raw) return resolve({})
            try {
                resolve(JSON.parse(raw))
            } catch {
                reject(Object.assign(new Error('请求不是合法 JSON'), { status: 400 }))
            }
        })
        req.on('error', reject)
    })
}

function send(res, status, payload) {
    const body = JSON.stringify(payload)
    res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store'
    })
    res.end(body)
}

function apiKeyFrom(req) {
    const header = String(req.headers['x-api-key'] || '').trim()
    return header || String(process.env.XIAOBAO_API_KEY || '').trim()
}

async function callUpstream(pathname, { key, json, form }) {
    const url = new URL(baseUrl + pathname)
    url.searchParams.set('key', key)
    const headers = { Accept: 'application/json' }
    let body
    if (form) {
        headers['Content-Type'] = 'application/x-www-form-urlencoded;charset=utf-8'
        const params = new URLSearchParams()
        params.set('key', key)
        for (const [name, value] of Object.entries(form)) {
            if (value == null || value === '') continue
            params.set(name, String(value))
        }
        body = params
    } else {
        headers['Content-Type'] = 'application/json;charset=utf-8'
        body = JSON.stringify({ key, ...json })
    }
    const response = await fetch(url, { method: 'POST', headers, body })
    const text = await response.text()
    let payload
    try {
        payload = JSON.parse(text)
    } catch {
        throw Object.assign(new Error('开放平台返回了无法识别的内容'), { status: 502 })
    }
    if (!response.ok && payload?.code == null) {
        throw Object.assign(new Error(`开放平台请求失败（HTTP ${response.status}）`), {
            status: 502
        })
    }
    return payload
}

async function handleParse(req, res) {
    const key = apiKeyFrom(req)
    if (!key) {
        send(res, 401, { ok: false, message: '请先填写销豹 API Key' })
        return
    }
    const body = await readBody(req)
    const url = String(body.url || '').trim()
    if (!url) {
        send(res, 400, { ok: false, message: '请粘贴分享链接或口令' })
        return
    }
    if (url.length > 2048) {
        send(res, 400, { ok: false, message: '链接超过 2048 个字符' })
        return
    }
    const pathName = endpointFor(url, String(body.platform || ''))
    const json = { url, content: url, link: url }
    if (pathName.endsWith('/videoparse')) json.flat = 2
    const payload = assertApiOk(await callUpstream(pathName, { key, json }))
    send(res, 200, {
        ok: true,
        endpoint: pathName,
        result: normalizeParse(payload, url)
    })
}

async function handleText(req, res) {
    const key = apiKeyFrom(req)
    if (!key) {
        send(res, 401, { ok: false, message: '请先填写销豹 API Key' })
        return
    }
    const body = await readBody(req)
    const taskId = String(body.taskId || body.task_id || '').trim()
    const content = String(body.content || '').trim()
    const language = String(body.language || '').trim()
    if (!taskId && !content) {
        send(res, 400, { ok: false, message: '没有可提取文案的媒体地址' })
        return
    }
    const form = {}
    if (taskId) form.taskId = taskId
    else form.content = content
    if (language) form.language = language
    const payload = assertApiOk(await callUpstream('/api/video/text', { key, form }))
    send(res, 200, { ok: true, result: normalizeText(payload) })
}

function serveStatic(req, res) {
    const url = new URL(req.url || '/', 'http://127.0.0.1')
    const rel = url.pathname === '/' ? '/index.html' : url.pathname
    const file = path.normalize(path.join(publicDir, rel))
    if (!file.startsWith(publicDir)) {
        res.writeHead(403)
        res.end('Forbidden')
        return
    }
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
        res.writeHead(404)
        res.end('Not found')
        return
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' })
    fs.createReadStream(file).pipe(res)
}

const server = http.createServer(async (req, res) => {
    try {
        if (req.method === 'POST' && req.url === '/api/parse') {
            await handleParse(req, res)
            return
        }
        if (req.method === 'POST' && req.url === '/api/text') {
            await handleText(req, res)
            return
        }
        if (req.method === 'GET') {
            serveStatic(req, res)
            return
        }
        send(res, 404, { ok: false, message: '没有这个接口' })
    } catch (error) {
        const upstream = Number(error.code)
        const status = error.status || (upstream >= 400 && upstream < 600 ? upstream : 400)
        send(res, status >= 400 && status < 600 ? status : 400, {
            ok: false,
            message: error.message || '请求失败'
        })
    }
})

server.listen(port, '127.0.0.1', () => {
    console.log(`video-copy  http://127.0.0.1:${port}`)
})
