# InnoArkEdge 统一边缘终端设计

## 背景

将「智创方舟 InnoArk」Vue 3 前端、ArkEngine Flask 后端、InnoArkEdge Python 传感器后台
合并为一个统一项目 **InnoArkEdge**，部署到树莓派 4B（Raspberry Pi OS Lite，无桌面环境），
实现软硬件结合的边缘终端。

- **硬件**：树莓派 4B + 触摸屏 + Samsung Watch6 (BLE) + USB Camera + ProxMark3 (RFID)
- **系统**：Raspberry Pi OS Lite（无桌面环境）
- **显示方案**：Xorg + Chromium Kiosk 全屏模式
- **前端**：InnoArk Vue 3 + naive-ui（原有前端系统合并入 InnoArkEdge）
- **应用 API**：ArkEngine Flask 服务（合并入 InnoArkEdge，本地运行）
- **传感器后台**：Python asyncio 服务（BLE/Camera/RFID 采集 + WebSocket）

## 项目结构

```
c:\Users\ABCDCreeper\Documents\Projects\InnoArkEdge\
├── frontend/                    # Vue 3 前端（原 InnoArk）
│   ├── src/
│   │   ├── api/                 # API 调用
│   │   ├── components/
│   │   │   └── sensor/          # 【新增】传感器/设备管理组件
│   │   ├── stores/
│   │   │   └── edge.ts          # 【新增】WebSocket + 传感器状态
│   │   ├── views/
│   │   │   └── Devices.vue      # 【新增】设备管理页
│   │   └── router/
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                     # Flask API（原 ArkEngine）
│   ├── app/
│   │   ├── routes/
│   │   ├── config.py
│   │   └── db.py
│   └── run.py
│
├── edge/                        # Python 传感器后台（原 InnoArkEdge）
│   ├── sensors/
│   │   ├── ble.py
│   │   ├── camera.py
│   │   └── rfid.py
│   ├── ws_server.py             # 【新增】WebSocket 服务
│   ├── wifi_manager.py          # 【新增】WiFi 管理
│   ├── bt_manager.py            # 【新增】蓝牙管理
│   ├── packager.py
│   ├── sender.py
│   └── config.py
│
├── scripts/                     # 部署脚本
│   ├── kiosk.sh                 # Kiosk 启动脚本
│   ├── install.sh               # 安装脚本
│   └── innoark-edge.service     # systemd 服务文件
│
├── nginx/                       # nginx 配置
│   └── innoark.conf
│
├── requirements.txt
└── main.py                      # 统一入口（启动 Flask + 传感器 + WebSocket）
```

## 架构

```
树莓派 4B ───────────────────────────────────────────────────
                                                              |
  ┌─────────── Chromium Kiosk ──────────────────────────┐     |
  │  http://localhost:80                                  │     |
  │                                                       │     |
  │  ┌────────────────────────────────┐  ┌─────────────┐  │     |
  │  │  设备管理页 /devices            │  │ InnoArk     │  │     |
  │  │  ├─ WiFi 配网（扫描/连接/手动IP） │  │ 标准页面     │  │     |
  │  │  ├─ 蓝牙管理（扫描/配对/连接）    │  │ (路由: /,   │  │     |
  │  │  └─ 传感器仪表盘（HR/注意力/RFID）│  │  /focus,    │  │     |
  │  └──────────┬─────────────────────┘  │  /projects)  │  │     |
  │             │ WebSocket              └──────┬───────┘  │     |
  │             │ ws://localhost/ws              │ REST     │     |
  │             ▼                                ▼         │     |
  │  ┌──────────────────────────────────────────────────┐  │     |
  │  │  nginx :80                                        │  │     |
  │  │  ├── / → frontend/dist (Vue 静态文件)             │  │     |
  │  │  ├── /ws → Python WebSocket (127.0.0.1:8765)     │  │     |
  │  │  └── /api/* → Flask API (127.0.0.1:5000)         │  │     |
  │  └──────────────────────────────────────────────────┘  │     |
  │                                                         │     |
  │  ┌── main.py（统一入口，asyncio 事件循环）────────────┐  │     |
  │  │  │                                                    │  │     |
  │  │  │  ┌───────────────┐  ┌────────────────────────┐    │  │     |
  │  │  ├─→│  Flask App    │  │  Sensor Pipeline       │    │  │     |
  │  │  │  │  (backend/)   │  │  ┌────┐ ┌──────┐ ┌───┐ │    │  │     |
  │  │  │  └───────────────┘  │  │BLE │ │Camera│ │RFID│ │    │  │     |
  │  │  │                     │  └────┘ └──────┘ └───┘ │    │  │     |
  │  │  │  ┌───────────────┐  └────────┬───────────────┘    │  │     |
  │  │  ├─→│  WebSocket    │←──────────┘                    │  │     |
  │  │  │  │  (edge/)      │──→ MQTT Sender ──→ 云端        │  │     |
  │  │  │  └───────────────┘                                │  │     |
  │  │  │  ┌───────────────┐                                │  │     |
  │  │  ├─→│  WiFi mgr     │                                │  │     |
  │  │  │  └───────────────┘                                │  │     |
  │  │  │  ┌───────────────┐                                │  │     |
  │  │  └─→│  BT mgr       │                                │  │     |
  │  │     └───────────────┘                                │  │     |
  │  └───────────────────────────────────────────────────────┘  │     |
  │                                                         │     │
  │  systemd                                                  │     │
  │  └─ innoark-edge.service (main.py)                       │     │
  │  └─ innoark-kiosk.service  (Xorg + Chromium)             │     │
  └───────────────────────────────────────────────────────────┘     |
```

## WebSocket 协议

### 推流（Python → 前端，周期性推送）

| 事件 | 频率 | Payload |
|------|------|---------|
| `sensor_data` | 每 5s | `{hr, hrv, attention_score, face_count, rfid_card}` |
| `sensor_status` | 每 10s | `{ble, camera, rfid}` 各传感器连接状态 |

### 请求-响应（前端 → Python）

| 命令 | Payload | 响应事件 | 说明 |
|------|---------|---------|------|
| `wifi_scan` | — | `wifi_networks` | 扫描附近 WiFi |
| `wifi_connect` | `{ssid, password, mode(dhcp/static), ip?, mask?, gateway?}` | `wifi_result` | 连接 WiFi |
| `wifi_status` | — | `wifi_status` | 当前连接状态 |
| `wifi_disconnect` | — | `wifi_result` | 断开 WiFi |
| `bt_scan` | — | `bt_devices` | 扫描蓝牙设备 |
| `bt_pair` | `{address}` | `bt_result` | 配对设备 |
| `bt_connect` | `{address}` | `bt_result` | 连接已配对设备 |
| `bt_disconnect` | — | `bt_result` | 断开蓝牙 |
| `bt_status` | — | `bt_status` | 当前蓝牙状态 |

## Vue 前端改动

### 新增文件

```
src/
├── stores/
│   └── edge.ts                 # WebSocket 连接 + 传感器数据状态 + WiFi/BT 命令封装
├── views/
│   └── Devices.vue             # 设备管理页面（三个标签页）
├── components/
│   └── sensor/
│       ├── SensorStatus.vue    # 顶部状态栏组件（心率/注意力/连接状态）
│       ├── WifiPanel.vue       # WiFi 扫描/连接/配置面板
│       ├── BluetoothPanel.vue  # 蓝牙扫描/配对/连接面板
│       └── SensorDashboard.vue # 传感器实时仪表盘（图表 + 事件日志）
└── router/
    └── index.ts                # 新增路由 /devices
```

### 修改文件

- **Layout.vue** — Header 右侧新增传感器状态显示（`<SensorStatus />`）
- **router/index.ts** — 添加 `/devices` 路由，需登录可访问

### `useEdgeStore` 设计

```typescript
interface EdgeState {
  ws: WebSocket | null
  connected: boolean
  sensorData: { hr: number; hrv: number; attention: number; faceCount: number; rfidCard: string | null }
  sensorStatus: { ble: string; camera: string; rfid: string }
  wifiNetworks: WifiNetwork[]
  wifiStatus: { connected: boolean; ssid: string; ip: string }
  btDevices: BtDevice[]
  btStatus: { scanning: boolean; paired: boolean; connected: boolean }
}
```

- `connect()` / `disconnect()` — 管理 WebSocket 生命周期
- 收到消息自动更新状态
- 发送命令方法：`send(cmd, payload?)`

## Python 后端改动

### 统一入口 main.py

```python
# main.py — 统一入口，在 asyncio 事件循环中同时运行 Flask + 传感器 + WebSocket
import asyncio
from edge import create_edge_app  # 传感器管道 + WebSocket
from backend.app import create_app  # Flask App

async def main():
    # 启动 Flask（线程中运行）
    flask_app = create_app()
    # 启动边缘服务（传感器 + WebSocket + WiFi/BT）
    edge_app = await create_edge_app()
    # aiohttp 同时承载 WebSocket + Flask（通过 aiohttp-wsgi）
    ...

asyncio.run(main())
```

### ws_server.py

- 绑定 `localhost:8765`，nginx 代理到 `/ws`
- 从传感器管道队列读取数据并主动推送
- 命令路由：解析 `{cmd, payload}` 分派

### wifi_manager.py

基于 `nmcli` 命令封装：

| 方法 | nmcli 命令 |
|------|-----------|
| `scan()` | `nmcli dev wifi list` |
| `connect(ssid, pw, dhcp/static)` | `nmcli dev wifi connect <ssid> password <pw>` |
| `status()` | `nmcli -t -f DEVICE,TYPE,STATE dev` |
| `disconnect()` | `nmcli con down <ssid>` |

### bt_manager.py

基于 `bluetoothctl` + `bleak`：

- `scan()` / `pair(addr)` / `connect(addr)` / `disconnect()` / `status()`

## 系统部署

### 安装清单

```bash
# 显示
apt install xserver-xorg-core xinit xinput unclutter

# 浏览器
apt install chromium-browser

# Web 服务器
apt install nginx

# 系统工具
apt install network-manager bluez bluetooth
```

### Python 依赖

```
bleak>=0.21.0
opencv-python>=4.9.0
aiohttp>=3.9.0
pyserial>=3.5
asyncio-mqtt>=0.16.0,<2.0.0
```

### 前端构建

```bash
cd InnoArkEdge/frontend/
npm install
npm run build
cp -r dist/* /var/www/innoark/
```

### main.py 部署路径

所有代码统一部署到 `/opt/innoark-edge/`：

```
/opt/innoark-edge/
├── main.py
├── frontend/dist/       # Vue 构建产物
├── backend/             # Flask
├── edge/                # 传感器 + WebSocket
├── scripts/
├── nginx/
├── requirements.txt
└── venv/
```

### nginx 配置

```nginx
server {
    listen 80;
    root /opt/innoark-edge/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /ws {
        proxy_pass http://127.0.0.1:8765;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
    }
}
```

### systemd 服务

`innoark-edge.service` — Python 传感器后台
`innoark-kiosk.service` — Kiosk 显示（依赖 edge 服务启动后）

### Kiosk 启动脚本

```bash
#!/bin/bash
xset s off
xset -dpms
xset s noblank
unclutter -idle 0 &
chromium-browser --kiosk \
  --no-first-run \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --touch-events=enabled \
  http://localhost
```

## 触摸屏适配

- 所有按钮 `min-height: 44px`（naive-ui 默认即可）
- 列表支持触摸滚动（`overflow-y: auto` + momentum）
- WiFi/BT 列表 touch-friendly 大行高
- Chromium 启动参数 `--touch-events=enabled`

## 实施顺序

1. **创建 spec & 计划** ← 当前
2. **搭建统一 InnoArkEdge 项目骨架** — 合并 InnoArk(frontend/) + ArkEngine(backend/) + 原有 edge/ 代码到同一目录
3. **Edge 后端改造** — 添加 ws_server, wifi_manager, bt_manager，重构 main.py 统一入口
4. **Vue 前端改造** — 添加 edge store, Devices 页面, 传感器组件，修改 Layout 添加状态栏
5. **本地构建与验证** — npm run build, 启动 main.py 测试 WebSocket + Flask + 传感器模拟
6. **部署到树莓派** — 安装系统组件、复制代码、配置 nginx + systemd
7. **集成测试** — 验证 BLE/Camera/RFID 数据流、WiFi/BT 操作、Kiosk 自启