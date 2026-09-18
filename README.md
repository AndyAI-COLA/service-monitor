# 服务状态监控面板 (Service Monitor)

一个轻量级的本地服务状态监控工具，用于实时监控 HTTP 服务和 TCP 端口的运行状态。

---

## 项目截图描述

### 页面布局

```
┌─────────────────────────────────────────────────────────────────┐
│                      ⚡ 服务状态监控面板                          │
│                    实时监控你的所有服务状态                        │
├─────────────────────────────────────────────────────────────────┤
│     ┌─────────┐      ┌─────────┐      ┌─────────┐              │
│     │  在线: 3 │      │ 离线: 1 │      │ 未知: 0 │              │
│     │   🟢    │      │   🔴    │      │   🟡    │              │
│     └─────────┘      └─────────┘      └─────────┘              │
├─────────────────────────────────────────────────────────────────┤
│  🔄 自动检查  [开关: ON]                                        │
│  检查间隔: [30] 秒  并发数: [5]  [保存设置]   🟢 运行中          │
│  [⚙ 高级设置]  [📥 导出数据]  [🔄 立即检查全部]  [➕ 添加服务]   │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────┐  ┌─────────────────────────┐      │
│  │  📊 响应时间趋势         │  │  📈 服务健康度           │      │
│  │  [折线图区域]            │  │  [雷达图区域]            │      │
│  └─────────────────────────┘  └─────────────────────────┘      │
├─────────────────────────────────────────────────────────────────┤
│  🖥️ 监控服务列表                                                │
│  ┌────────────────────────┐  ┌────────────────────────┐        │
│  │ 百度                    │  │ GitHub                 │        │
│  │ 🌐 URL  可用率:98%      │  │ 🌐 URL  可用率:100%    │        │
│  │ 健康度 95 - 优秀        │  │ 健康度 100 - 优秀      │        │
│  │ 🟢 在线                 │  │ 🟢 在线                │        │
│  │ https://www.baidu.com   │  │ https://github.com     │        │
│  │ 响应时间: 120ms ████████│  │ 响应时间: 350ms ██████ │        │
│  │ 状态历史: ██ ██ ██ ██   │  │ 状态历史: ██ ██ ██ ██  │        │
│  │ 上次检查: 2026/9/16 16:00│ │ 上次检查: 2026/9/16 16:00│      │
│  │ [🔍 检查] [🗑️ 删除]    │  │ [🔍 检查] [🗑️ 删除]   │        │
│  └────────────────────────┘  └────────────────────────┘        │
│  ┌────────────────────────┐  ┌────────────────────────┐        │
│  │ MySQL 数据库            │  │ Redis 缓存             │        │
│  │ 🔌 端口  可用率:85%     │  │ 🔌 端口  可用率:100%   │        │
│  │ 健康度 72 - 良好        │  │ 健康度 98 - 优秀       │        │
│  │ 🔴 离线                 │  │ 🟢 在线                │        │
│  │ localhost:3306          │  │ localhost:6379          │        │
│  │ 响应时间: 500ms ████████│  │ 响应时间: 15ms █████████│       │
│  │ 状态历史: ████ ████     │  │ 状态历史: ██ ██ ██ ██  │        │
│  │ 上次检查: 2026/9/16 16:00│ │ 上次检查: 2026/9/16 16:00│      │
│  │ [🔍 检查] [🗑️ 删除]    │  │ [🔍 检查] [🗑️ 删除]   │        │
│  └────────────────────────┘  └────────────────────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

### 界面特点

- **深色主题** - 采用深蓝色渐变背景，护眼且美观
- **卡片式布局** - 每个服务独立卡片，信息清晰
- **实时状态指示** - 绿色/红色/黄色圆点直观显示状态
- **响应式设计** - 支持手机、平板、电脑等不同屏幕
- **交互式图表** - 鼠标悬停可查看详细数据

---

## 功能介绍

### 核心功能

| 功能 | 说明 |
|------|------|
| 🌐 **HTTP 监控** | 检查网站 URL 是否返回 200 状态码 |
| 🔌 **端口监控** | 检查 TCP 端口是否可连接 |
| 🔄 **定时自动检查** | 可设置 5-3600 秒间隔自动检查 |
| ⚡ **并发控制** | 可设置同时检查的服务数量 (1-20) |
| 📊 **响应时间图表** | 折线图展示各服务响应时间趋势 |
| 📈 **健康度雷达图** | 多维度展示服务健康状态 |
| ⏱️ **状态时间线** | 可视化展示历史检查记录 |
| 💾 **数据持久化** | 自动保存到 JSON 文件，重启不丢失 |
| 🔔 **Webhook 通知** | 服务状态变化时发送通知 |
| 📤 **数据导出** | 支持 JSON/CSV 格式导出 |

### 健康度评分

健康度评分基于三个维度计算（满分100分）：

| 维度 | 权重 | 计算方式 |
|------|------|----------|
| 可用率 | 40分 | (在线次数 / 总检查次数) × 40 |
| 响应速度 | 40分 | 根据平均响应时间计算 |
| 稳定性 | 20分 | 最近10次检查的一致性 |

评分等级：
- 🟢 **优秀 (90-100分)** - 服务运行稳定
- 🔵 **良好 (70-89分)** - 服务基本正常
- 🟡 **一般 (50-69分)** - 服务偶有问题
- 🔴 **较差 (0-49分)** - 服务不稳定

---

## 安装步骤

### 前置要求

- Node.js 14.x 或更高版本
- npm 6.x 或更高版本

### 安装

```bash
# 克隆项目
git clone <repository-url>

# 进入项目目录
cd service-monitor

# 安装依赖
npm install
```

---

## 启动方法

### 方式一：使用 npm

```bash
# 启动服务器
npm start

# 或使用开发模式
npm run dev
```

### 方式二：直接运行

```bash
# 启动服务器
node server-simple.js
```

### 方式三：Windows 批处理

双击 `start.bat` 文件即可启动。

### 访问面板

启动成功后，打开浏览器访问：

```
http://localhost:3000
```

### 启动成功标志

```
Service Monitor running at http://localhost:3000
API available at http://localhost:3000/api
Auto Check: OFF, Interval: 30s
Concurrency: 5, Webhook: Not configured
```

---

## API 接口文档

### 基础信息

- **Base URL**: `http://localhost:3000`
- **Content-Type**: `application/json`
- **支持 CORS**: 是

---

### 1. 获取所有服务

**请求**

```http
GET /api/services
```

**参数**

无

**返回值**

```json
[
    {
        "id": 1,
        "name": "百度",
        "type": "url",
        "target": "https://www.baidu.com",
        "status": "online",
        "lastCheck": "2026-09-16T08:00:00.000Z",
        "responseTime": 120,
        "history": [
            {
                "time": "2026-09-16T08:00:00.000Z",
                "status": "online",
                "duration": 120
            }
        ],
        "healthScore": 95
    }
]
```

**字段说明**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 服务唯一 ID |
| name | string | 服务名称 |
| type | string | 类型: "url" 或 "port" |
| target | string | 监控目标 (URL 或 host:port) |
| status | string | 状态: "online" / "offline" / "unknown" |
| lastCheck | string | 上次检查时间 (ISO 8601) |
| responseTime | number | 上次响应时间 (毫秒) |
| history | array | 历史检查记录 (最多50条) |
| healthScore | number | 健康度评分 (0-100) |

---

### 2. 添加服务

**请求**

```http
POST /api/services
```

**请求体**

```json
{
    "name": "我的网站",
    "url": "https://example.com"
}
```

或

```json
{
    "name": "MySQL",
    "port": "localhost:3306"
}
```

**参数说明**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 服务名称 |
| url | string | 否* | HTTP 服务 URL |
| port | string | 否* | TCP 端口 (格式: host:port) |

> *url 和 port 至少填写一个

**返回值**

```json
{
    "id": 2,
    "name": "我的网站",
    "type": "url",
    "target": "https://example.com",
    "status": "unknown",
    "lastCheck": null,
    "history": [],
    "healthScore": 0
}
```

**错误响应**

```json
// 缺少 name
{
    "error": "Name is required"
}
// 状态码: 400

// 缺少 url 或 port
{
    "error": "Either url or port is required"
}
// 状态码: 400
```

---

### 3. 删除服务

**请求**

```http
DELETE /api/services/:id
```

**参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | number | 服务 ID (路径参数) |

**返回值**

```json
{
    "success": true
}
```

**错误响应**

```json
{
    "error": "Service not found"
}
// 状态码: 404
```

---

### 4. 检查单个服务

**请求**

```http
GET /api/check/:id
```

**参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | number | 服务 ID (路径参数) |

**返回值**

```json
{
    "id": 1,
    "name": "百度",
    "type": "url",
    "target": "https://www.baidu.com",
    "status": "online",
    "lastCheck": "2026-09-16T08:30:00.000Z",
    "responseTime": 150,
    "history": [...],
    "healthScore": 95
}
```

---

### 5. 检查所有服务

**请求**

```http
GET /api/check-all
```

**参数**

无

**返回值**

返回所有服务的数组，格式同"获取所有服务"。

---

### 6. 获取设置

**请求**

```http
GET /api/settings
```

**返回值**

```json
{
    "enabled": true,
    "interval": 30,
    "webhookUrl": "https://example.com/webhook",
    "concurrency": 5
}
```

**字段说明**

| 字段 | 类型 | 说明 |
|------|------|------|
| enabled | boolean | 自动检查是否开启 |
| interval | number | 检查间隔 (秒) |
| webhookUrl | string | Webhook 通知 URL |
| concurrency | number | 并发检查数量 |

---

### 7. 更新设置

**请求**

```http
POST /api/settings
```

**请求体**

```json
{
    "enabled": true,
    "interval": 60,
    "webhookUrl": "https://example.com/webhook",
    "concurrency": 10
}
```

**参数说明**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| enabled | boolean | 否 | 开启/关闭自动检查 |
| interval | number | 否 | 检查间隔 (5-3600秒) |
| webhookUrl | string | 否 | Webhook URL (空字符串清除) |
| concurrency | number | 否 | 并发数 (1-20) |

**返回值**

返回更新后的完整设置对象。

---

### 8. 获取统计数据

**请求**

```http
GET /api/stats
```

**返回值**

```json
[
    {
        "id": 1,
        "name": "百度",
        "uptime": 98,
        "totalChecks": 50,
        "onlineCount": 49,
        "offlineCount": 1,
        "avgResponseTime": 120,
        "healthScore": 95
    }
]
```

**字段说明**

| 字段 | 类型 | 说明 |
|------|------|------|
| uptime | number | 可用率百分比 (0-100) |
| totalChecks | number | 总检查次数 |
| onlineCount | number | 在线次数 |
| offlineCount | number | 离线次数 |
| avgResponseTime | number | 平均响应时间 (毫秒) |
| healthScore | number | 健康度评分 (0-100) |

---

### 9. 导出数据

**请求**

```http
GET /api/export?format=json
GET /api/export?format=csv
```

**参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| format | string | 导出格式: "json" 或 "csv" |

**JSON 返回示例**

```json
{
    "exportTime": "2026-09-16T08:00:00.000Z",
    "services": [...]
}
```

**CSV 返回示例**

```csv
ID,Name,Type,Target,Status,LastCheck,ResponseTime,HealthScore,Uptime
1,"百度",url,"https://www.baidu.com",online,2026-09-16T08:00:00.000Z,120,95,98
```

---

### 10. 测试 Webhook

**请求**

```http
POST /api/webhook/test
```

**请求体**

```json
{
    "url": "https://example.com/webhook"
}
```

**返回值**

```json
{
    "success": true,
    "statusCode": 200,
    "message": "Webhook test sent successfully"
}
```

---

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| **后端** | Node.js | JavaScript 运行环境 |
| **HTTP** | http (内置) | Node.js 原生 HTTP 模块 |
| **TCP** | net (内置) | Node.js 原生网络模块 |
| **前端** | HTML5 | 页面结构 |
| **样式** | CSS3 | 页面样式 (渐变、动画、响应式) |
| **脚本** | JavaScript (ES6+) | 前端交互逻辑 |
| **图表** | Chart.js | 图表可视化 (CDN) |
| **存储** | JSON 文件 | 数据持久化 |

### 零依赖说明

本项目**不依赖任何第三方 npm 包**，所有功能均使用 Node.js 内置模块实现：

- `http` - 创建 HTTP 服务器、发送 HTTP 请求
- `https` - 发送 HTTPS 请求
- `net` - TCP 端口检查
- `fs` - 文件读写 (数据持久化)
- `path` - 路径处理
- `url` - URL 解析

---

## 项目结构

```
service-monitor/
├── server-simple.js    # 主服务文件
├── package.json        # 项目配置
├── data.json           # 数据文件 (自动生成)
├── public/             # 前端静态文件
│   └── index.html      # 前端页面
├── start.bat           # Windows 启动脚本
├── start.ps1           # PowerShell 启动脚本
├── LICENSE             # MIT 许可证
├── README.md           # 项目文档
└── .gitignore          # Git 忽略文件
```

---

## 常见问题

### Q: 页面无法打开？

A: 
1. 确认服务器已启动
2. 检查端口 3000 是否被占用
3. 尝试强制刷新 (Ctrl+Shift+R)
4. 尝试使用无痕模式访问

### Q: 图表不显示？

A: 
图表需要从 CDN 加载 Chart.js，如果网络受限可能无法显示。
其他功能不受影响，可正常使用。

### Q: 数据重启后丢失？

A: 
数据自动保存在 `data.json` 文件中，重启后会自动加载。
如果该文件被删除，数据会丢失。

### Q: 如何修改端口？

A:
编辑 `server-simple.js` 文件，修改 `PORT` 变量的值：
```javascript
const PORT = 8080; // 修改为你想要的端口
```

---

## License

MIT
