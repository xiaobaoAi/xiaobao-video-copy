# 接口对照

页面只做这三件事，密钥由调用方自己申请，服务不代持。

| 步骤 | 文档 | 地址 | 何时用 |
| --- | --- | --- | --- |
| 全平台解析 | [doc/43](https://xiaoapis.com/doc/43) | `POST /api/video/videoparse` | 抖音、快手、小红书、B 站、微博、TikTok、YouTube 等 |
| 视频号解析 | [doc/57](https://xiaoapis.com/doc/57) | `POST /api/video/weixin` | 微信视频号分享链接或口令 |
| 提取口播文案 | [doc/28](https://xiaoapis.com/doc/28) | `POST /api/video/text` | 已有视频或音频公网地址之后 |

在线产品对照：[xiaobao.ink/video-copy](https://xiaobao.ink/video-copy)

## 全平台解析

同步接口。成功扣 1 点，失败不扣费。`flat=2` 时 `type` 只有「视频 / 图集 / 实况图集」。

```http
POST https://xiaoapis.com/api/video/videoparse?key=你的密钥
Content-Type: application/json

{ "key": "你的密钥", "url": "分享链接或口令", "flat": 2 }
```

常用字段：`title`、`desc`、`cover_url`、`video_url`、`images`、`author`、`stats`、`source`。`source` 里的版权说明要展示给最终用户。

## 视频号解析

同步接口。成功扣 2 点，失败不扣费。平台标识为 `weixin_channels`。

```http
POST https://xiaoapis.com/api/video/weixin?key=你的密钥
Content-Type: application/json

{ "key": "你的密钥", "url": "视频号分享链接" }
```

作者可能是对象：`author.name` / `author.avatar`。备选清晰度在 `video_backup`。

## 提取口播文案

异步接口。`content` 传视频或音频公网地址，不带 `taskId` 是提交，带上是查询。完成后读 `resultText`。

```http
POST https://xiaoapis.com/api/video/text?key=你的密钥
Content-Type: application/x-www-form-urlencoded

content=https://example.com/video.mp4
```

查询时把 `content` 换成 `taskId`。`language` 可选，默认自动识别。

## 本地封装

本仓库的页面不把密钥写进前端代码。浏览器把密钥放在请求头 `X-Api-Key`，由本机 `server.mjs` 转发到上面三个地址。

- `POST /api/parse`：`{ "url", "platform" }`，按链接自动选择 doc/43 或 doc/57
- `POST /api/text`：`{ "content" }` 提交，或 `{ "taskId" }` 查询
