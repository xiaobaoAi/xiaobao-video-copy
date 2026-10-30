import test from 'node:test'
import assert from 'node:assert/strict'
import {
    endpointFor,
    looksLikeWeixin,
    normalizeParse,
    normalizeText
} from '../lib/parse.mjs'

test('视频号链接走专用接口', () => {
    const url = 'https://channels.weixin.qq.com/finder/abc'
    assert.equal(looksLikeWeixin(url), true)
    assert.equal(endpointFor(url, 'douyin'), '/api/video/weixin')
})

test('抖音短链走全平台解析', () => {
    const url = 'https://v.douyin.com/abc/'
    assert.equal(looksLikeWeixin(url, 'douyin'), false)
    assert.equal(endpointFor(url), '/api/video/videoparse')
})

test('手动选择视频号时也走专用接口', () => {
    assert.equal(endpointFor('随便一段口令', 'weixin'), '/api/video/weixin')
})

test('全平台结果收成页面用的结构', () => {
    const view = normalizeParse(
        {
            code: 200,
            data: {
                platform: 'xiaohongshu',
                type: '视频',
                title: '标题',
                desc: '正文',
                video_url: 'https://cdn.example/a.mp4',
                cover_url: 'https://cdn.example/c.jpg',
                images: ['https://cdn.example/1.jpg', 'https://cdn.example/1.jpg'],
                author: '示例作者',
                stats: { like_count: 3, comment_count: 1 },
                source: { platform_label: '小红书', copyright_notice: '版权归作者' }
            }
        },
        'https://www.xiaohongshu.com/discovery/item/1'
    )
    assert.equal(view.platform_label, '小红书')
    assert.equal(view.author.name, '示例作者')
    assert.equal(view.images.length, 1)
    assert.equal(view.stats.like_count, 3)
    assert.equal(view.source.copyright_notice, '版权归作者')
})

test('视频号作者对象也能读出昵称', () => {
    const view = normalizeParse(
        {
            data: {
                platform: 'weixin_channels',
                author: { name: '号主', avatar: 'https://cdn.example/a.jpg' },
                video_backup: [{ quality: '原画', url: 'https://cdn.example/v.mp4' }]
            }
        },
        'https://channels.weixin.qq.com/x'
    )
    assert.equal(view.author.name, '号主')
    assert.equal(view.video_url, 'https://cdn.example/v.mp4')
})

test('文案任务未完成时继续轮询', () => {
    const view = normalizeText({
        code: 200,
        msg: '任务提交成功',
        data: { taskId: 'abc', status: 'processing' }
    })
    assert.equal(view.status, 'processing')
    assert.equal(view.task_id, 'abc')
})

test('文案完成时返回正文', () => {
    const view = normalizeText({
        code: 200,
        data: { taskid: 'abc', status: 'completed', resultText: '口播正文' }
    })
    assert.equal(view.status, 'completed')
    assert.equal(view.text, '口播正文')
})
