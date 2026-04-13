# VastAIDemo

Vastbase 产品 AI 产品化演示 Demo

## 项目简介

本项目是 Vastbase 海量数据库产品的 AI 智能化演示平台，展示了一站式智能数据库全生命周期管理能力。通过集成智能评估、数据迁移、故障诊断、全栈运维监控等功能，为数据库管理提供智能化解决方案。

## 整体流程

```
┌─────────────────────────────────────────────────────────────────┐
│                        首页 (index.html)                         │
│                    智能数据库管理平台入口                          │
└─────────────────────────────────────────────────────────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
┌───────────────┐       ┌───────────────┐       ┌───────────────┐
│  智能评估      │       │  智能迁移      │       │  运维监控      │
│ module-install │       │module-migrate │       │module-monitor │
└───────────────┘       └───────────────┘       └───────────────┘
        │
        │         ┌─────────────────────────────────────────────┐
        └─────────▶              报错答疑模块                     │
                  └─────────────────────────────────────────────┘
                                          │
                          ┌───────────────┼───────────────┐
                          ▼               ▼               ▼
                  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
                  │  跳转页面      │ │  问题提交      │ │  智能对话      │
                  │module-support │ │support-submit │ │ support-chat  │
                  └───────────────┘ └───────────────┘ └───────────────┘
                          │               │               │
                          │    (提交问题)   │   (开始对话)   │
                          └───────────────┴───────────────┘
```

## 功能模块

### 1. 智能评估 (module-install.html)

数据库和应用迁移评估模块，通过自动化评估数据库配置、兼容性、应用改造点及工作量，一键生成全面的迁移评估报告。

- 数据库配置评估
- 兼容性分析
- 应用改造点识别
- 工作量评估
- 评估报告生成

### 2. 智能迁移 (module-migrate.html)

智能数据迁移模块，支持全量和增量数据迁移，提供迁移进度监控和数据校验功能。

- 迁移任务配置
- 数据迁移执行
- 迁移进度监控
- 数据一致性校验

### 3. 报错答疑

Vastbase 智能助手"量仔"，提供智能问答和技术支持服务。

**页面流程：**
1. `module-support.html` - 跳转过渡页，显示加载动画后自动跳转
2. `support-submit.html` - 问题提交表单，填写问题标题、类型、描述及上传附件
3. `support-chat.html` - 智能对话界面，与 AI 助手进行实时对话

**功能特性：**
- 问题智能诊断
- 解决方案推荐
- 知识库检索
- 对话式交互
- 文件上传支持

### 4. 运维监控 (module-monitor.html)

智能运维监控模块，提供全方位的数据库运行状态监控和告警服务。

- 实时性能监控
- 资源使用统计
- 异常告警通知
- 历史数据分析

## 技术栈

- **前端**: 原生 HTML + Tailwind CSS (CDN)
- **图表**: Chart.js
- **图标**: Font Awesome 4.7
- **Markdown 渲染**: marked.js
- **后端**: Node.js 原生 HTTP 服务器
- **AI 接口**: Dify API (SSE 流式对话)

## 环境要求

- **Node.js**: v14.0.0 或更高版本（推荐 v18+）
- **npm**: v6.0.0 或更高版本
- **操作系统**: Linux（生产环境部署需要 systemd 支持）

```bash
node -v
npm -v
```

## 快速开始

### 安装依赖

```bash
npm install
```

### 本地开发

```bash
npm run dev
```

服务将在 `http://localhost:8081` 启动。

> **重要说明**：本项目包含一个代理服务器 (`server.js`)，用于转发 Dify API 请求并解决跨域问题。如果使用 Dify 模型进行对话，**必须**通过上述方式启动代理服务器，否则会出现 504 Gateway Timeout 错误。

### 可用的启动命令

| 命令 | 说明 | 端口 |
|------|------|------|
| `npm run dev` | 启动代理服务器（推荐，支持 Dify API 代理） | 8081 |
| `npm start` | 同 `npm run dev`，生产环境使用 | 8081 |
| `npm run dev:static` | 仅启动静态文件服务器（不支持 Dify 代理） | 8081 |

### 环境变量配置

项目支持通过 `.env` 文件配置运行参数，参考 `.env.example` 创建：

```bash
cp .env.example .env
```

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 服务监听端口 | `8081` |
| `LOCAL_IP` | 服务器 IP 地址 | `43.139.131.125` |
| `DIFY_API_BASE` | Dify API 地址 | `http://101.35.56.39` |
| `DIFY_API_KEY` | Dify API 密钥（从 `.env` 文件读取，**前端不持有此密钥**） | 无（必填） |
| `NODE_ENV` | 运行环境 | `production` |

## 生产环境部署

### 云主机部署方案（从零开始）

以下步骤适用于一台全新的 Linux 云主机（CentOS / Ubuntu 均可）：

#### 1. 安装 Node.js

```bash
# CentOS / RHEL
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Ubuntu / Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo bash -
sudo apt-get install -y nodejs

# 验证安装
node -v
npm -v
```

#### 2. 上传项目到云主机

```bash
# 方式一：使用 scp 上传（在本地执行）
scp -r ./VastAIDemo root@<云主机IP>:/opt/

# 方式二：使用 git clone（如果项目在 Git 仓库）
ssh root@<云主机IP>
cd /opt
git clone <仓库地址> vastbase-support
```

#### 3. 配置环境变量

```bash
cd /opt/vastbase-support

# 根据模板创建配置文件
cp .env.example .env

# 编辑配置，填入实际的 IP 和 API Key
vi .env
```

`.env` 配置示例：

```env
PORT=8081
LOCAL_IP=43.139.131.125
DIFY_API_BASE=http://101.35.56.39
DIFY_API_KEY=app-your-dify-api-key-here
NODE_ENV=production
```

> **重要**：`DIFY_API_KEY` 为必填项，请替换为实际的 Dify API 密钥。密钥由后端代理统一管理，不会暴露给前端。

#### 4. 安装依赖并启动

```bash
# 安装依赖
npm install --production

# 前台启动（用于调试）
node server.js

# 看到以下输出表示启动成功：
# Server running at http://43.139.131.125:8081/
#   Local:   http://127.0.0.1:8081/
#   Network: http://43.139.131.125:8081/
# Dify API Proxy: /api/dify/* -> http://101.35.56.39/*
# MVS Submit API: POST /api/mvs/submit
```

#### 5. 注册为系统服务（推荐）

```bash
# 复制 service 文件
sudo cp vastbase-support.service /etc/systemd/system/

# 重新加载 systemd 配置
sudo systemctl daemon-reload

# 设置开机自启并启动服务
sudo systemctl enable vastbase-support
sudo systemctl start vastbase-support

# 检查服务状态
sudo systemctl status vastbase-support
```

#### 6. 防火墙放行端口

```bash
# CentOS / RHEL（firewalld）
sudo firewall-cmd --permanent --add-port=8081/tcp
sudo firewall-cmd --reload

# Ubuntu（ufw）
sudo ufw allow 8081/tcp

# 或者直接使用 iptables
sudo iptables -A INPUT -p tcp --dport 8081 -j ACCEPT
```

部署完成后，浏览器访问 `http://<云主机IP>:8081` 即可使用。

### 一键部署（推荐）

将项目上传到服务器后，执行部署脚本即可自动完成安装、配置和服务注册：

```bash
chmod +x install.sh
sudo ./install.sh
```

部署脚本会自动完成以下操作：
1. 检查 Node.js 环境
2. 停止已有服务
3. 复制项目文件到 `/opt/vastbase-support`
4. 安装 npm 依赖
5. 注册并启动 systemd 服务

### 手动部署

```bash
# 1. 复制项目到目标目录
sudo mkdir -p /opt/vastbase-support
sudo cp -r ./* /opt/vastbase-support/
sudo cp .env /opt/vastbase-support/

# 2. 安装依赖
cd /opt/vastbase-support && npm install --production

# 3. 注册 systemd 服务
sudo cp vastbase-support.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable vastbase-support
sudo systemctl start vastbase-support
```

### 服务管理

```bash
sudo systemctl start vastbase-support      # 启动服务
sudo systemctl stop vastbase-support       # 停止服务
sudo systemctl restart vastbase-support    # 重启服务
sudo systemctl status vastbase-support     # 查看状态
journalctl -u vastbase-support -f          # 查看实时日志
```

### API 代理说明

代理服务器 (`server.js`) 提供以下功能：

- **Dify API 代理**: `/api/dify/*` → Dify API 服务器（自动注入 API Key，前端无需持有密钥）
- **MVS 工单提交**: `POST /api/mvs/submit` → 创建 Dify 对话并重定向
- **超时设置**: 300 秒（适用于长时间的 AI 对话请求）
- **跨域支持**: 自动添加 CORS 头
- **密钥管理**: Dify API Key 通过 `.env` 文件配置，由后端代理统一注入 `Authorization` 请求头，前端页面不接触密钥

## 项目结构

```
VastAIDemo/
├── index.html                    # 首页/平台入口
├── module-install.html           # 智能评估模块
├── module-migrate.html           # 智能迁移模块
├── module-support.html           # 报错答疑跳转页
├── support-submit.html           # 报错答疑 - 问题提交表单
├── support-chat.html             # 报错答疑 - 智能对话界面
├── module-monitor.html           # 运维监控模块
├── server.js                     # Node.js 代理服务器（自动注入 API Key）
├── package.json                  # 项目配置
├── .env                          # 环境变量配置（含 API Key，不提交到版本库）
├── .env.example                  # 环境变量示例
├── vastbase-support.service      # systemd 服务配置
├── install.sh                    # 一键部署脚本
├── .gitignore                    # Git 忽略配置
└── README.md                     # 项目说明
```

## 页面导航关系

| 页面 | 入口 | 跳转目标 |
|------|------|----------|
| index.html | - | module-install.html, module-migrate.html, module-support.html, module-monitor.html |
| module-support.html | index.html | support-submit.html (自动跳转) |
| support-submit.html | module-support.html | support-chat.html (提交问题后) |
| support-chat.html | support-submit.html | - |
| module-install.html | index.html | - |
| module-migrate.html | index.html | - |
| module-monitor.html | index.html | - |

## 浏览器支持

- Chrome (推荐)
- Firefox
- Safari
- Edge

## 报错答疑模块详细说明

### 会话机制

报错答疑模块使用 `conversationId` 进行会话管理，确保用户对话的连续性和上下文保持：

- **会话持久化**: 会话 ID 自动存储在 localStorage，刷新页面不会丢失对话上下文
- **全局状态管理**: 通过 `AppState` 对象统一管理会话状态，包括：
  - `conversationId`: 当前会话的唯一标识符（UUID 格式）

### 重置对话

点击聊天界面右上角的「新对话」按钮可以开始新的对话：

1. 点击「新对话」按钮
2. 确认弹窗中点击「确定」
3. 系统将：
   - 生成新的 `conversationId`
   - 清空当前对话消息
   - 清除已上传的文件

### 模型配置

Dify AI 模型通过后端代理服务器统一配置，API Key 存储在服务端 `.env` 文件中：

| 配置项 | 位置 | 说明 |
|------|------|------|
| `DIFY_API_KEY` | `.env` 文件 | Dify API 密钥（必填，由后端代理自动注入） |
| `DIFY_API_BASE` | `.env` 文件 | Dify API 地址（默认 `http://101.35.56.39`） |

修改 `.env` 后需重启服务：

```bash
sudo systemctl restart vastbase-support
```

官方文档：https://docs.dify.ai/

### 连通性检测

部署完成后，可通过以下方式验证服务是否正常：

```bash
# 检查服务状态
sudo systemctl status vastbase-support

# 检查 Dify API 代理是否正常（应返回 JSON 响应）
curl http://localhost:8081/api/dify/v1/parameters

# 查看实时日志
journalctl -u vastbase-support -f
```

## 许可证

ISC
