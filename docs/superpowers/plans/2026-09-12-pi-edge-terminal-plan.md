# InnoArkEdge 统一边缘终端 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 InnoArk 前端、ArkEngine 后端、InnoArkEdge 传感器后台合并为统一项目 InnoArkEdge，部署到树莓派 4B 触摸屏 Kiosk 终端。

**Architecture:** nginx(:80) 统一入口，Vue 3 前端通过 WebSocket 直连 Python 传感器后台获取实时数据，通过 REST API 调用本地 Flask 后端。Python asyncio 主循环同时运行传感器管道 + WebSocket Server + WiFi/BT 管理 + Flask（aiohttp-wsgi 桥接）。

**Tech Stack:** Vue 3 + naive-ui + Pinia / Python asyncio + aiohttp + bleak + OpenCV / nginx + Xorg + Chromium Kiosk

---

## 文件结构

```
c:\Users\ABCDCreeper\Documents\Projects\InnoArkEdge\
├── main.py                        # [M] 统一入口
├── requirements.txt                # [C] Python 依赖
├── frontend/                       # [C] Vue 3（从 InnoArk/ 复制）
│   ├── src/
│   │   ├── stores/
│   │   │   └── edge.ts             # [C] 新增 - WebSocket + 传感器状态
│   │   ├── views/
│   │   │   └── Devices.vue         # [C] 新增 - 设备管理页
│   │   ├── components/
│   │   │   └── sensor/
│   │   │       ├── SensorStatus.vue    # [C] 新增 - 状态栏
│   │   │       ├── WifiPanel.vue       # [C] 新增 - WiFi 面板
│   │   │       ├── BluetoothPanel.vue  # [C] 新增 - 蓝牙面板
│   │   │       └── SensorDashboard.vue # [C] 新增 - 传感器仪表盘
│   │   ├── router/
│   │   │   └── index.ts            # [M] 添加 /devices 路由
│   │   └── App.vue                 # [M] 添加 SensorStatus 到 Layout header
│   └── package.json                # [U] 不变（naive-ui 已含所需组件）
│
├── edge/                            # [C] Python 传感器后台
│   ├── __init__.py                  # [C] create_edge_app()
│   ├── config.py                    # [C] 配置（从项目记忆重建）
│   ├── sensors/
│   │   ├── __init__.py
│   │   ├── ble.py                   # [C] BLE 心率传感器
│   │   ├── camera.py                # [C] 摄像头注意力推理
│   │   └── rfid.py                  # [C] RFID 读卡器
│   ├── packager.py                  # [C] 数据打包
│   ├── sender.py                    # [C] MQTT 发送
│   ├── ws_server.py                 # [C] 新增 - WebSocket 服务
│   ├── wifi_manager.py              # [C] 新增 - WiFi 管理
│   └── bt_manager.py                # [C] 新增 - 蓝牙管理
│
├── backend/                         # [C] Flask（从 ArkEngine/ 复制）
│   ├── __init__.py
│   ├── app/
│   │   ├── __init__.py
│   │   ├── config.py
│   │   ├── db.py
│   │   ├── auth.py
│   │   ├── errors.py
│   │   ├── services.py
│   │   └── routes/ (全部)
│   └── run.py
│
├── scripts/
│   ├── kiosk.sh                     # [C] 新增 - Kiosk 启动脚本
│   ├── install.sh                   # [C] 新增 - 安装脚本 (Pi)
│   └── innoark-edge.service         # [C] 新增 - systemd 单元
│
└── nginx/
    └── innoark.conf                 # [C] 新增 - nginx 配置
```

`[C] = Create  [M] = Modify  [U] = Unchanged`

---

### Task 1: 搭建 InnoArkEdge 项目骨架

**Files:**
- Create: `InnoArkEdge/frontend/` (复制 InnoArk/)
- Create: `InnoArkEdge/backend/` (复制 ArkEngine/)
- Create: `InnoArkEdge/edge/__init__.py`
- Create: `InnoArkEdge/requirements.txt`
- Create: 目录 `InnoArkEdge/edge/sensors/`, `InnoArkEdge/scripts/`, `InnoArkEdge/nginx/`

- [ ] **Step 1: 创建顶层目录**

```bash
mkdir -p c:\Users\ABCDCreeper\Documents\Projects\InnoArkEdge
mkdir -p c:\Users\ABCDCreeper\Documents\Projects\InnoArkEdge\edge\sensors
mkdir -p c:\Users\ABCDCreeper\Documents\Projects\InnoArkEdge\scripts
mkdir -p c:\Users\ABCDCreeper\Documents\Projects\InnoArkEdge\nginx
```

- [ ] **Step 2: 复制 InnoArk → frontend/**

```bash
xcopy /E /I c:\Users\ABCDCreeper\Documents\Projects\InnoArk\* c:\Users\ABCDCreeper\Documents\Projects\InnoArkEdge\frontend\
```

- [ ] **Step 3: 复制 ArkEngine → backend/**

```bash
xcopy /E /I c:\Users\ABCDCreeper\Documents\Projects\ArkEngine\* c:\Users\ABCDCreeper\Documents\Projects\InnoArkEdge\backend\
```

- [ ] **Step 4: 创建 edge/__init__.py**

```python
"""InnoArkEdge — 传感器采集、WebSocket 服务、WiFi/蓝牙管理。"""

from .ws_server import WebSocketServer
from .wifi_manager import WiFiManager
from .bt_manager import BTManager
```

- [ ] **Step 5: 创建 requirements.txt**

```
# Flask API
flask>=3.0

# 传感器
bleak>=0.21.0
opencv-python>=4.9.0
pyserial>=3.5

# WebSocket + 异步 Web
aiohttp>=3.9.0
aiohttp-wsgi>=0.10.0

# MQTT
asyncio-mqtt>=0.16.0,<2.0.0
```

- [ ] **Step 6: 提交骨架**

```bash
cd c:\Users\ABCDCreeper\Documents\Projects\InnoArkEdge
git init
git add -A
git commit -m "chore: init InnoArkEdge project skeleton (frontend + backend + edge)"
```

---

### Task 2: 重建 edge/config.py（从项目记忆还原）

**Files:**
- Create: `InnoArkEdge/edge/config.py`

- [ ] **Step 1: 创建 edge/config.py**

```python
"""边缘终端配置。"""

import os
import json
from dataclasses import dataclass, field, asdict
from typing import Optional


@dataclass
class EdgeConfig:
    # 设备标识
    device_id: str = os.environ.get("INNOARK_DEVICE_ID", "pi4b-001")

    # BLE
    ble_scan_interval: int = 10          # 扫描间隔（秒）
    ble_aggregate_window: int = 5        # HR/HRV 聚合窗口（秒）
    ble_target_device: Optional[str] = os.environ.get("BLE_TARGET")

    # Camera
    camera_fps: int = 10
    camera_device: int = 0

    # RFID
    rfid_poll_interval: float = 0.5

    # MQTT
    mqtt_broker: str = os.environ.get("MQTT_BROKER", "")
    mqtt_port: int = int(os.environ.get("MQTT_PORT", "1883"))
    mqtt_topic_prefix: str = "innoark/edge"
    mqtt_reconnect_delay: int = 5

    # WebSocket
    ws_host: str = "127.0.0.1"
    ws_port: int = 8765

    # Flask
    flask_host: str = "127.0.0.1"
    flask_port: int = 5000

    # Database
    db_path: str = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "data", "innoark.db"
    )

    @classmethod
    def load(cls, path: Optional[str] = None) -> "EdgeConfig":
        if path and os.path.exists(path):
            with open(path) as f:
                data = json.load(f)
            return cls(**{k: v for k, v in data.items() if k in asdict(cls())})
        return cls()
```

- [ ] **Step 2: 验证正确性**

```bash
cd InnoArkEdge
python -c "from edge.config import EdgeConfig; print(EdgeConfig().device_id)"
```

---

### Task 3: 重建 edge/sensors/ble.py（BLE 心率传感器）

**Files:**
- Create: `InnoArkEdge/edge/sensors/__init__.py`
- Create: `InnoArkEdge/edge/sensors/ble.py`

- [ ] **Step 1: 创建 sensors/__init__.py**

```python
from .ble import BLESensor
from .camera import CameraSensor
from .rfid import RfidSensor
```

- [ ] **Step 2: 创建 edge/sensors/ble.py**

```python
"""BLE 心率传感器 — 连接 Samsung Watch6，采集 HR/HRV。"""

import asyncio
import struct
import time
from dataclasses import dataclass
from typing import Optional

from bleak import BleakClient, BleakScanner
from bleak.backends.device import BLEDevice

from ..config import EdgeConfig

HR_SERVICE_UUID = "0000180d-0000-1000-8000-00805f9b34fb"
HR_CHAR_UUID = "00002a37-0000-1000-8000-00805f9b34fb"

RR_WINDOW_SIZE = 10


@dataclass
class HeartRateData:
    hr: int
    hrv: float  # RMSSD
    rr_intervals: list[int]
    timestamp: float


class BLESensor:
    def __init__(self, config: EdgeConfig, queue: asyncio.Queue):
        self._config = config
        self._queue = queue
        self._client: Optional[BleakClient] = None
        self._lock = asyncio.Lock()
        self._rr_buffer: list[int] = []
        self._last_push = 0.0

    async def run(self):
        while True:
            try:
                device = await self._find_device()
                if not device:
                    await asyncio.sleep(self._config.ble_scan_interval)
                    continue

                async with BleakClient(device) as client:
                    self._client = client
                    await client.start_notify(HR_CHAR_UUID, self._on_hr_data)
                    await self._wait_disconnect(client)
            except Exception as exc:
                print(f"[BLE] Error: {exc}")
                await asyncio.sleep(5)

    async def _find_device(self) -> Optional[BLEDevice]:
        target = self._config.ble_target_device
        if target:
            return await BleakScanner.find_device_by_address(target)
        # 回退：扫描所有设备
        devices = await BleakScanner.discover(timeout=5)
        for d in devices:
            if "watch" in (d.name or "").lower() or "galaxy" in (d.name or "").lower():
                return d
        return None

    def _on_hr_data(self, _sender: int, data: bytearray):
        hr = data[1]  # HR 在第二个字节
        rr_intervals = []
        offset = 2
        while offset + 2 <= len(data):
            rr = struct.unpack("<H", data[offset:offset + 2])[0]
            rr_intervals.append(rr)
            offset += 2

        async def push():
            async with self._lock:
                self._rr_buffer.extend(rr_intervals)
                if len(self._rr_buffer) > RR_WINDOW_SIZE:
                    self._rr_buffer = self._rr_buffer[-RR_WINDOW_SIZE:]

            now = time.time()
            if now - self._last_push >= self._config.ble_aggregate_window:
                hrv = self._calc_hrv()
                self._last_push = now
                await self._queue.put({
                    "type": "sensor",
                    "sensor": "ble",
                    "data": HeartRateData(hr=hr, hrv=hrv, rr_intervals=list(self._rr_buffer), timestamp=now)
                })

        asyncio.ensure_future(push())

    async def _wait_disconnect(self, client: BleakClient):
        while client.is_connected:
            await asyncio.sleep(1)

    def _calc_hrv(self) -> float:
        if len(self._rr_buffer) < 2:
            return 0.0
        diffs = [abs(self._rr_buffer[i] - self._rr_buffer[i - 1]) for i in range(1, len(self._rr_buffer))]
        rmsdd = (sum(d * d for d in diffs) / len(diffs)) ** 0.5
        return round(rmsdd, 2)

    async def stop(self):
        if self._client and self._client.is_connected:
            await self._client.disconnect()
```

- [ ] **Step 3: 验证语法**

```bash
cd InnoArkEdge
python -c "from edge.sensors.ble import BLESensor, HeartRateData; print('BLE OK')"
```

---

### Task 4: 重建 edge/sensors/camera.py（摄像头注意力推理）

**Files:**
- Create: `InnoArkEdge/edge/sensors/camera.py`

- [ ] **Step 1: 创建 edge/sensors/camera.py**

```python
"""摄像头传感器 — OpenCV Haar Cascade 人脸检测 + 注意力评分。"""

import asyncio
import time
from dataclasses import dataclass
from typing import Optional

import cv2

from ..config import EdgeConfig


@dataclass
class AttentionData:
    face_count: int
    attention_score: float  # 0.0 - 1.0
    timestamp: float


class CameraSensor:
    def __init__(self, config: EdgeConfig, queue: asyncio.Queue):
        self._config = config
        self._queue = queue
        self._cap: Optional[cv2.VideoCapture] = None
        self._cascade: Optional[cv2.CascadeClassifier] = None

    async def run(self):
        self._cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )
        self._cap = cv2.VideoCapture(self._config.camera_device)
        if not self._cap.isOpened():
            print("[Camera] Cannot open camera, retrying...")
            await asyncio.sleep(5)
            return

        interval = 1.0 / self._config.camera_fps
        while True:
            ret, frame = self._cap.read()
            if not ret:
                await asyncio.sleep(interval)
                continue

            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = self._cascade.detectMultiScale(gray, 1.1, 5, minSize=(60, 60))

            face_count = len(faces)
            attention = self._score_attention(faces, frame.shape)

            await self._queue.put({
                "type": "sensor",
                "sensor": "camera",
                "data": AttentionData(face_count=face_count, attention_score=attention, timestamp=time.time())
            })

            await asyncio.sleep(interval)

    def _score_attention(self, faces: list, frame_shape: tuple) -> float:
        if len(faces) == 0:
            return 0.0
        h, w = frame_shape[:2]
        cx, cy = w / 2, h / 2
        scores = []
        for (x, y, fw, fh) in faces:
            face_cx = x + fw / 2
            face_cy = y + fh / 2
            dx = abs(face_cx - cx) / cx
            dy = abs(face_cy - cy) / cy
            dist_score = max(0, 1.0 - (dx + dy) / 2)
            size_score = min(1.0, (fw * fh) / (w * h * 0.3))
            scores.append(dist_score * 0.6 + size_score * 0.4)
        return round(sum(scores) / len(scores), 2)

    async def stop(self):
        if self._cap and self._cap.isOpened():
            self._cap.release()
```

- [ ] **Step 2: 验证语法**

```bash
cd InnoArkEdge
python -c "from edge.sensors.camera import CameraSensor, AttentionData; print('Camera OK')"
```

---

### Task 5: 重建 edge/sensors/rfid.py（RFID 读卡器）

**Files:**
- Create: `InnoArkEdge/edge/sensors/rfid.py`

- [ ] **Step 1: 创建 edge/sensors/rfid.py**

```python
"""RFID 传感器 — ProxMark3 Easy，串口自动检测。"""

import asyncio
import time
import serial.tools.list_ports
from dataclasses import dataclass
from typing import Optional

from ..config import EdgeConfig


@dataclass
class RfidData:
    card_id: str
    timestamp: float


class RfidSensor:
    def __init__(self, config: EdgeConfig, queue: asyncio.Queue):
        self._config = config
        self._queue = queue
        self._serial: Optional[serial.Serial] = None

    async def run(self):
        while True:
            try:
                port = self._find_port()
                if not port:
                    await asyncio.sleep(3)
                    continue

                self._serial = serial.Serial(port, 115200, timeout=1)
                self._serial.write(b"hw search\r")
                await self._read_loop()
            except Exception as exc:
                print(f"[RFID] Error: {exc}")
                await asyncio.sleep(3)

    def _find_port(self) -> Optional[str]:
        for p in serial.tools.list_ports.comports():
            if "proxmark" in (p.description or "").lower() or "pm3" in (p.product or "").lower():
                return p.device
        return None

    async def _read_loop(self):
        while self._serial and self._serial.is_open:
            if self._serial.in_waiting > 0:
                line = self._serial.readline().decode(errors="ignore").strip()
                if line and self._is_card_id(line):
                    await self._queue.put({
                        "type": "sensor",
                        "sensor": "rfid",
                        "data": RfidData(card_id=line, timestamp=time.time())
                    })
            await asyncio.sleep(self._config.rfid_poll_interval)

    async def stop(self):
        if self._serial and self._serial.is_open:
            self._serial.close()

    @staticmethod
    def _is_card_id(text: str) -> bool:
        return len(text) in (8, 14) and all(c in "0123456789abcdefABCDEF" for c in text)
```

- [ ] **Step 2: 验证语法**

```bash
cd InnoArkEdge
python -c "from edge.sensors.rfid import RfidSensor, RfidData; print('RFID OK')"
```

---

### Task 6: 重建 edge/packager.py + edge/sender.py（数据打包与 MQTT 发送）

**Files:**
- Create: `InnoArkEdge/edge/packager.py`
- Create: `InnoArkEdge/edge/sender.py`

- [ ] **Step 1: 创建 edge/packager.py**

```python
"""数据打包 — 将传感器数据封装为统一 JSON 格式。"""

import json
import time
import uuid
from typing import Any

from .config import EdgeConfig


def make_packet(sensor_type: str, payload: Any, config: EdgeConfig) -> str:
    packet = {
        "header": {
            "packet_id": str(uuid.uuid4())[:8],
            "device_id": config.device_id,
            "timestamp": time.time(),
            "sensor_type": sensor_type,
        },
        "payload": payload,
    }
    return json.dumps(packet)
```

- [ ] **Step 2: 创建 edge/sender.py**

```python
"""MQTT 发送器 — 带 SQLite 离线缓冲。"""

import asyncio
import json
import sqlite3
import os
import time

from .config import EdgeConfig


class Sender:
    def __init__(self, config: EdgeConfig, input_queue: asyncio.Queue):
        self._config = config
        self._input_queue = input_queue
        self._mqtt = None
        self._db_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)), "data", "buffer.db"
        )

    async def run(self):
        os.makedirs(os.path.dirname(self._db_path), exist_ok=True)
        self._init_db()

        while True:
            packet = await self._input_queue.get()
            sent = await self._send_mqtt(packet)
            if sent:
                self._flush_buffer()
            else:
                self._buffer_packet(packet)
                await asyncio.sleep(5)  # 5s 重试间隔

    def _init_db(self):
        with sqlite3.connect(self._db_path) as conn:
            conn.execute(
                "CREATE TABLE IF NOT EXISTS buffer (id INTEGER PRIMARY KEY, packet TEXT, ts REAL)"
            )

    def _buffer_packet(self, packet: str):
        with sqlite3.connect(self._db_path) as conn:
            conn.execute("INSERT INTO buffer (packet, ts) VALUES (?, ?)", (packet, time.time()))

    def _flush_buffer(self):
        with sqlite3.connect(self._db_path) as conn:
            rows = conn.execute("SELECT id, packet FROM buffer ORDER BY id").fetchall()
            for row_id, pkt in rows:
                if not self._mqtt or not self._mqtt.is_connected():
                    break
                self._mqtt.publish(self._topic(), pkt)
                conn.execute("DELETE FROM buffer WHERE id = ?", (row_id,))

    def _topic(self) -> str:
        return f"{self._config.mqtt_topic_prefix}/{self._config.device_id}/{self._sensor_type}"

    async def _send_mqtt(self, packet: str) -> bool:
        try:
            import asyncio_mqtt as mqtt
            if not self._mqtt:
                self._mqtt = mqtt.Client(
                    self._config.mqtt_broker,
                    port=self._config.mqtt_port,
                )
                await self._mqtt.connect()
            await self._mqtt.publish(self._topic(), packet)
            return True
        except Exception:
            return False
```

- [ ] **Step 3: 验证语法**

```bash
cd InnoArkEdge
python -c "from edge.packager import make_packet; from edge.sender import Sender; print('Packager + Sender OK')"
```

---

### Task 7: 新建 edge/ws_server.py（WebSocket 服务）

**Files:**
- Create: `InnoArkEdge/edge/ws_server.py`

- [ ] **Step 1: 创建 edge/ws_server.py**

```python
"""WebSocket 服务 — 推送传感器数据 + 响应 WiFi/BT 命令。"""

import asyncio
import json
import time
from typing import Any

from aiohttp import web, web_ws

from .config import EdgeConfig
from .wifi_manager import WiFiManager
from .bt_manager import BTManager


class WebSocketServer:
    def __init__(self, config: EdgeConfig, sensor_queue: asyncio.Queue):
        self._config = config
        self._sensor_queue = sensor_queue
        self._clients: set[web.WebSocketResponse] = set()
        self._wifi = WiFiManager()
        self._bt = BTManager()
        self._app = web.Application()
        self._app.router.add_get("/ws", self._handle_ws)

    async def run(self):
        runner = web.AppRunner(self._app)
        await runner.setup()
        site = web.TCPSite(runner, self._config.ws_host, self._config.ws_port)
        await site.start()
        print(f"[WS] Server started on {self._config.ws_host}:{self._config.ws_port}")

        # 并行推送传感器数据
        await self._broadcast_loop()

    async def _handle_ws(self, request: web.Request) -> web.WebSocketResponse:
        ws = web.WebSocketResponse(heartbeat=30.0)
        await ws.prepare(request)
        self._clients.add(ws)
        print(f"[WS] Client connected ({len(self._clients)} total)")

        try:
            async for msg in ws:
                if msg.type == web.WSMsgType.TEXT:
                    await self._handle_command(ws, json.loads(msg.data))
                elif msg.type == web.WSMsgType.ERROR:
                    print(f"[WS] Error: {ws.exception()}")
        finally:
            self._clients.discard(ws)
            print(f"[WS] Client disconnected ({len(self._clients)} total)")

        return ws

    async def _handle_command(self, ws: web.WebSocketResponse, cmd: dict):
        action = cmd.get("cmd", "")
        payload = cmd.get("payload", {})

        handlers = {
            "wifi_scan": self._wifi.scan,
            "wifi_connect": lambda: self._wifi.connect(payload),
            "wifi_status": self._wifi.status,
            "wifi_disconnect": self._wifi.disconnect,
            "bt_scan": self._bt.scan,
            "bt_pair": lambda: self._bt.pair(payload.get("address", "")),
            "bt_connect": lambda: self._bt.connect(payload.get("address", "")),
            "bt_disconnect": self._bt.disconnect,
            "bt_status": self._bt.status,
        }

        handler = handlers.get(action)
        if handler:
            result = await handler()
            await ws.send_json({"event": action, "payload": result})
        else:
            await ws.send_json({"event": "error", "payload": f"Unknown cmd: {action}"})

    async def _broadcast_loop(self):
        """从传感器队列读取数据，广播给所有 WebSocket 客户端。"""
        while True:
            data = await self._sensor_queue.get()
            if not self._clients:
                continue

            # 将 dataclass 转为字典
            payload = data["data"]
            if hasattr(payload, "__dataclass_fields__"):
                payload = {k: getattr(payload, k) for k in payload.__dataclass_fields__}

            message = json.dumps({
                "event": "sensor_data",
                "payload": payload,
                "sensor": data["sensor"],
                "timestamp": time.time(),
            })

            disconnected = set()
            for ws in self._clients:
                try:
                    await ws.send_str(message)
                except Exception:
                    disconnected.add(ws)
            self._clients -= disconnected
```

- [ ] **Step 2: 验证语法**

```bash
cd InnoArkEdge
python -c "from edge.ws_server import WebSocketServer; print('WS Server OK')"
```

---

### Task 8: 新建 edge/wifi_manager.py（WiFi 管理）

**Files:**
- Create: `InnoArkEdge/edge/wifi_manager.py`

- [ ] **Step 1: 创建 edge/wifi_manager.py**

```python
"""WiFi 管理 — 基于 nmcli 命令封装。"""

import asyncio
import re
from typing import Optional


class WiFiManager:
    async def scan(self) -> list[dict]:
        """扫描附近 WiFi 网络。"""
        proc = await asyncio.create_subprocess_exec(
            "nmcli", "-t", "-f", "SSID,SIGNAL,SECURITY", "dev", "wifi", "list",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await proc.communicate()
        networks = []
        for line in stdout.decode().strip().split("\n"):
            if not line:
                continue
            parts = line.split(":")
            if len(parts) >= 3:
                networks.append({
                    "ssid": parts[0],
                    "signal": int(parts[1]) if parts[1].isdigit() else 0,
                    "security": parts[2],
                })
        return networks

    async def connect(self, payload: dict) -> dict:
        """连接 WiFi 网络。"""
        ssid = payload.get("ssid", "")
        password = payload.get("password", "")
        mode = payload.get("mode", "dhcp")  # dhcp | static

        # 连接网络
        cmd = ["nmcli", "dev", "wifi", "connect", ssid]
        if password:
            cmd.extend(["password", password])
        proc = await asyncio.create_subprocess_exec(*cmd)
        await proc.wait()

        # 手动 IP 配置
        if mode == "static":
            ip = payload.get("ip", "")
            mask = payload.get("mask", "24")
            gateway = payload.get("gateway", "")
            con_name = ssid
            cmds = [
                ["nmcli", "con", "mod", con_name, "ipv4.method", "manual"],
                ["nmcli", "con", "mod", con_name, "ipv4.addresses", f"{ip}/{mask}"],
            ]
            if gateway:
                cmds.append(["nmcli", "con", "mod", con_name, "ipv4.gateway", gateway])
            for c in cmds:
                p = await asyncio.create_subprocess_exec(*c)
                await p.wait()

        # 获取结果
        status = await self.status()
        return {"success": status.get("connected", False), "ssid": ssid, **status}

    async def status(self) -> dict:
        """查询当前 WiFi 连接状态。"""
        proc = await asyncio.create_subprocess_exec(
            "nmcli", "-t", "-f", "DEVICE,TYPE,STATE,CONNECTION", "dev",
            stdout=asyncio.subprocess.PIPE,
        )
        stdout, _ = await proc.communicate()
        for line in stdout.decode().strip().split("\n"):
            parts = line.split(":")
            if len(parts) >= 4 and parts[1] == "wifi" and parts[2] == "connected":
                return {"connected": True, "ssid": parts[3], "ip": ""}
        return {"connected": False, "ssid": "", "ip": ""}

    async def disconnect(self) -> dict:
        """断开当前 WiFi。"""
        status = await self.status()
        if status.get("ssid"):
            proc = await asyncio.create_subprocess_exec(
                "nmcli", "con", "down", status["ssid"]
            )
            await proc.wait()
        return {"success": True}
```

- [ ] **Step 2: 验证语法**

```bash
cd InnoArkEdge
python -c "from edge.wifi_manager import WiFiManager; print('WiFi OK')"
```

---

### Task 9: 新建 edge/bt_manager.py（蓝牙管理）

**Files:**
- Create: `InnoArkEdge/edge/bt_manager.py`

- [ ] **Step 1: 创建 edge/bt_manager.py**

```python
"""蓝牙管理 — 基于 bluetoothctl 封装蓝牙扫描/配对/连接。"""

import asyncio
import re
from typing import Optional


class BTManager:
    async def scan(self) -> list[dict]:
        """扫描蓝牙设备。"""
        proc = await asyncio.create_subprocess_exec(
            "bluetoothctl", "--", "scan", "on",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.DEVNULL,
        )
        try:
            stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=10)
        except asyncio.TimeoutError:
            proc.kill()
            stdout, _ = await proc.communicate()

        devices = []
        for line in stdout.decode().strip().split("\n"):
            m = re.search(r"Device\s+([0-9A-Fa-f:]+)\s+(.*)", line)
            if m:
                devices.append({"address": m.group(1), "name": m.group(2).strip()})
        return devices

    async def pair(self, address: str) -> dict:
        proc = await asyncio.create_subprocess_exec(
            "bluetoothctl", "pair", address,
            stdout=asyncio.subprocess.PIPE,
        )
        stdout, _ = await proc.communicate()
        success = "Pairing successful" in stdout.decode()
        return {"success": success, "address": address}

    async def connect(self, address: str) -> dict:
        proc = await asyncio.create_subprocess_exec(
            "bluetoothctl", "connect", address,
            stdout=asyncio.subprocess.PIPE,
        )
        stdout, _ = await proc.communicate()
        success = "Connection successful" in stdout.decode()
        return {"success": success, "address": address}

    async def disconnect(self) -> dict:
        proc = await asyncio.create_subprocess_exec("bluetoothctl", "disconnect")
        await proc.wait()
        return {"success": True}

    async def status(self) -> dict:
        proc = await asyncio.create_subprocess_exec(
            "bluetoothctl", "show",
            stdout=asyncio.subprocess.PIPE,
        )
        stdout, _ = await proc.communicate()
        output = stdout.decode()
        return {
            "powered": "Powered: yes" in output,
            "discovering": "Discovering: yes" in output,
        }
```

- [ ] **Step 2: 验证语法**

```bash
cd InnoArkEdge
python -c "from edge.bt_manager import BTManager; print('BT OK')"
```

---

### Task 10: 新建 edge/__init__.py 工厂函数 + 统一 main.py

**Files:**
- Create: `InnoArkEdge/edge/__init__.py`（替换之前的空文件）
- Create: `InnoArkEdge/main.py`

- [ ] **Step 1: 编写 edge/__init__.py 工厂函数**

```python
"""InnoArkEdge — 边缘终端服务。"""

import asyncio

from .config import EdgeConfig
from .sensors import BLESensor, CameraSensor, RfidSensor
from .ws_server import WebSocketServer


async def create_edge_app(config: EdgeConfig) -> tuple[asyncio.Queue, WebSocketServer]:
    """创建传感器管道：BLE/Camera/RFID → Queue → WebSocket 广播。"""
    sensor_queue: asyncio.Queue = asyncio.Queue(maxsize=100)

    # 启动物理传感器协程
    sensors = [
        BLESensor(config, sensor_queue),
        CameraSensor(config, sensor_queue),
        RfidSensor(config, sensor_queue),
    ]
    for s in sensors:
        asyncio.create_task(s.run())

    # 启动 WebSocket 服务
    ws_server = WebSocketServer(config, sensor_queue)
    asyncio.create_task(ws_server.run())

    return sensor_queue, ws_server
```

- [ ] **Step 2: 编写 main.py 统一入口**

```python
#!/usr/bin/env python3
"""InnoArkEdge 统一入口 — 同时运行 Flask + 传感器管道 + WebSocket。"""

import asyncio
import os
import sys

# 添加项目根到路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from aiohttp import web
from aiohttp_wsgi import WSGIHandler

from edge.config import EdgeConfig
from edge import create_edge_app
from backend.app import create_app as create_flask_app


async def main():
    config = EdgeConfig.load()

    # 创建 Flask WSGI 应用
    flask_app = create_flask_app()
    wsgi_handler = WSGIHandler(flask_app)

    # 创建传感器管道 + WebSocket
    await create_edge_app(config)

    # 使用单个 aiohttp server 承载 Flask + WebSocket
    app = web.Application()
    app.router.add_route("*", "/api{tail:.*}", wsgi_handler)
    app.router.add_route("*", "/api/", wsgi_handler)
    # WebSocket 路由由 edge/ws_server.py 自行启动独立端口
    # nginx 会将 /ws 代理到该端口

    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, config.flask_host, config.flask_port)
    await site.start()
    print(f"[Main] Flask API on {config.flask_host}:{config.flask_port}")

    # 保持运行
    await asyncio.Event().wait()


if __name__ == "__main__":
    asyncio.run(main())
```

- [ ] **Step 3: 验证语法**

```bash
cd InnoArkEdge
python -c "from edge import create_edge_app; from edge.config import EdgeConfig; print('main OK')"
```

---

### Task 11: Vue 前端 — 创建 edge store (stores/edge.ts)

**Files:**
- Create: `InnoArkEdge/frontend/src/stores/edge.ts`

- [ ] **Step 1: 创建 stores/edge.ts**

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface SensorData {
  hr: number
  hrv: number
  attention: number
  faceCount: number
  rfidCard: string | null
}

export interface WifiNetwork {
  ssid: string
  signal: number
  security: string
}

export interface BtDevice {
  address: string
  name: string
}

export const useEdgeStore = defineStore('edge', () => {
  const connected = ref(false)
  const sensorData = ref<SensorData>({ hr: 0, hrv: 0, attention: 0, faceCount: 0, rfidCard: null })
  const sensorStatus = ref({ ble: 'disconnected', camera: 'disconnected', rfid: 'disconnected' })

  const wifiNetworks = ref<WifiNetwork[]>([])
  const wifiStatus = ref({ connected: false, ssid: '', ip: '' })

  const btDevices = ref<BtDevice[]>([])
  const btStatus = ref({ scanning: false, paired: false, connected: false })

  let ws: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null

  function connect() {
    if (ws && ws.readyState === WebSocket.OPEN) return
    ws = new WebSocket(`ws://${location.host}/ws`)

    ws.onopen = () => { connected.value = true }
    ws.onclose = () => {
      connected.value = false
      reconnectTimer = setTimeout(connect, 3000)
    }
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        handleMessage(msg)
      } catch { /* ignore parse errors */ }
    }
  }

  function disconnect() {
    if (reconnectTimer) clearTimeout(reconnectTimer)
    ws?.close()
    ws = null
    connected.value = false
  }

  function handleMessage(msg: any) {
    switch (msg.event) {
      case 'sensor_data':
        sensorData.value = { ...sensorData.value, ...msg.payload }
        break
      case 'sensor_status':
        sensorStatus.value = msg.payload
        break
      case 'wifi_networks':
        wifiNetworks.value = msg.payload
        break
      case 'wifi_status':
      case 'wifi_result':
        wifiStatus.value = { ...wifiStatus.value, ...msg.payload }
        break
      case 'bt_devices':
        btDevices.value = msg.payload
        break
      case 'bt_status':
      case 'bt_result':
        btStatus.value = { ...btStatus.value, ...msg.payload }
        break
    }
  }

  function send(cmd: string, payload?: Record<string, any>) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ cmd, payload }))
    }
  }

  return {
    connected, sensorData, sensorStatus,
    wifiNetworks, wifiStatus,
    btDevices, btStatus,
    connect, disconnect, send,
  }
})
```

- [ ] **Step 2: 验证 TypeScript 编译**

```bash
cd InnoArkEdge/frontend
npx vue-tsc --noEmit src/stores/edge.ts
```

---

### Task 12: Vue 前端 — 创建 SensorStatus.vue（全局状态栏组件）

**Files:**
- Create: `InnoArkEdge/frontend/src/components/sensor/SensorStatus.vue`

- [ ] **Step 1: 创建 SensorStatus.vue**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { NIcon, NPopover, NSpace, NText, NTag } from 'naive-ui'
import { PulseOutline, EyeOutline, CardOutline } from '@vicons/ionicons5'
import { useEdgeStore } from '../../stores/edge'

const edge = useEdgeStore()

const bleStatus = computed(() => ({
  color: edge.sensorStatus.ble === 'connected' ? '#18a058' : '#d03050',
  icon: PulseOutline,
  label: `${edge.sensorData.hr} bpm`,
}))

const attentionLevel = computed(() => {
  const a = edge.sensorData.attention
  if (a > 0.7) return { color: '#18a058', text: '专注' }
  if (a > 0.3) return { color: '#f0a020', text: '一般' }
  return { color: '#d03050', text: '分散' }
})
</script>

<template>
  <n-space align="center" size="small">
    <!-- 蓝牙状态 -->
    <n-popover trigger="hover">
      <template #trigger>
        <n-tag :bordered="false" :color="{ text: bleStatus.color, border: 'transparent' }" size="small" style="cursor:pointer;">
          <template #icon>
            <n-icon :color="bleStatus.color"><component :is="bleStatus.icon" /></n-icon>
          </template>
          {{ bleStatus.label }}
        </n-tag>
      </template>
      <n-text>BLE: {{ edge.sensorStatus.ble }} | HRV: {{ edge.sensorData.hrv }}</n-text>
    </n-popover>

    <!-- 注意力状态 -->
    <n-popover trigger="hover">
      <template #trigger>
        <n-tag :bordered="false" :color="{ text: attentionLevel.color, border: 'transparent' }" size="small" style="cursor:pointer;">
          <template #icon>
            <n-icon :color="attentionLevel.color"><eye-outline /></n-icon>
          </template>
          {{ attentionLevel.text }}
        </n-tag>
      </template>
      <n-text>注意力: {{ (edge.sensorData.attention * 100).toFixed(0) }}% | 人脸: {{ edge.sensorData.faceCount }}</n-text>
    </n-popover>

    <!-- RFID 状态 -->
    <n-popover trigger="hover">
      <template #trigger>
        <n-tag :bordered="false" :color="{ text: edge.sensorData.rfidCard ? '#18a058' : '#666', border: 'transparent' }" size="small" style="cursor:pointer;">
          <template #icon>
            <n-icon><card-outline /></n-icon>
          </template>
          {{ edge.sensorData.rfidCard ? '卡片' : '待卡' }}
        </n-tag>
      </template>
      <n-text>{{ edge.sensorData.rfidCard ? `RFID: ${edge.sensorData.rfidCard}` : '等待刷卡...' }}</n-text>
    </n-popover>
  </n-space>
</template>
```

---

### Task 13: Vue 前端 — 创建 WifiPanel.vue

**Files:**
- Create: `InnoArkEdge/frontend/src/components/sensor/WifiPanel.vue`

- [ ] **Step 1: 创建 WifiPanel.vue**

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  NCard, NButton, NList, NListItem, NTag, NSpace, NText, NModal,
  NInput, NForm, NFormItem, NFormItemGi, NRadio, NRadioGroup, NSpin,
  useMessage,
} from 'naive-ui'
import { useEdgeStore } from '../../stores/edge'

const edge = useEdgeStore()
const message = useMessage()
const loading = ref(false)
const showConnectModal = ref(false)
const selectedSsid = ref('')
const password = ref('')
const mode = ref<'dhcp' | 'static'>('dhcp')
const ip = ref('')
const mask = ref('24')
const gateway = ref('')

async function scan() {
  loading.value = true
  edge.send('wifi_scan')
  // 等待响应
  setTimeout(() => { loading.value = false }, 2000)
}

async function connect() {
  edge.send('wifi_connect', {
    ssid: selectedSsid.value,
    password: password.value,
    mode: mode.value,
    ip: ip.value || undefined,
    mask: mask.value || undefined,
    gateway: gateway.value || undefined,
  })
  showConnectModal.value = false
  message.success(`正在连接 ${selectedSsid.value}...`)
}

function openConnect(ssid: string) {
  selectedSsid.value = ssid
  password.value = ''
  mode.value = 'dhcp'
  ip.value = ''
  gateway.value = ''
  showConnectModal.value = true
}

function disconnect() {
  edge.send('wifi_disconnect')
  message.info('正在断开 WiFi...')
}

onMounted(() => { edge.send('wifi_status') })
</script>

<template>
  <n-card title="WiFi 网络">
    <template #header-extra>
      <n-space>
        <n-tag v-if="edge.wifiStatus.connected" type="success" size="small">
          {{ edge.wifiStatus.ssid }}
        </n-tag>
        <n-button size="small" @click="scan" :loading="loading" :disabled="loading">
          扫描
        </n-button>
        <n-button v-if="edge.wifiStatus.connected" size="small" type="warning" @click="disconnect">
          断开
        </n-button>
      </n-space>
    </template>

    <n-list v-if="edge.wifiNetworks.length > 0">
      <n-list-item v-for="net in edge.wifiNetworks" :key="net.ssid">
        <n-space align="center" justify="space-between">
          <n-space align="center">
            <n-text strong>{{ net.ssid }}</n-text>
            <n-tag size="tiny" :bordered="false">{{ net.signal }}%</n-tag>
            <n-tag v-if="net.security && net.security !== ''" size="tiny" type="warning" :bordered="false">
              加密
            </n-tag>
            <n-tag v-else size="tiny" type="success" :bordered="false">开放</n-tag>
          </n-space>
          <n-button size="tiny" @click="openConnect(net.ssid)">连接</n-button>
        </n-space>
      </n-list-item>
    </n-list>
    <n-text v-else depth="3">点击扫描以发现附近网络</n-text>
  </n-card>

  <n-modal v-model:show="showConnectModal" title="连接 WiFi" preset="card" style="width: 420px;">
    <n-form>
      <n-form-item label="SSID"><n-input :value="selectedSsid" disabled /></n-form-item>
      <n-form-item label="密码"><n-input v-model:value="password" type="password" placeholder="输入 WiFi 密码" /></n-form-item>
      <n-form-item label="IP 模式">
        <n-radio-group v-model:value="mode">
          <n-radio value="dhcp">DHCP（自动）</n-radio>
          <n-radio value="static">手动</n-radio>
        </n-radio-group>
      </n-form-item>
      <template v-if="mode === 'static'">
        <n-form-item label="IP 地址"><n-input v-model:value="ip" placeholder="192.168.1.100" /></n-form-item>
        <n-form-item label="子网掩码"><n-input v-model:value="mask" placeholder="24" /></n-form-item>
        <n-form-item label="网关"><n-input v-model:value="gateway" placeholder="192.168.1.1" /></n-form-item>
      </template>
      <n-button type="primary" block @click="connect">连接</n-button>
    </n-form>
  </n-modal>
</template>
```

---

### Task 14: Vue 前端 — 创建 BluetoothPanel.vue

**Files:**
- Create: `InnoArkEdge/frontend/src/components/sensor/BluetoothPanel.vue`

- [ ] **Step 1: 创建 BluetoothPanel.vue**

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { NCard, NButton, NList, NListItem, NSpace, NText, NTag, useMessage } from 'naive-ui'
import { useEdgeStore } from '../../stores/edge'

const edge = useEdgeStore()
const message = useMessage()
const scanning = ref(false)

async function scan() {
  scanning.value = true
  edge.send('bt_scan')
  setTimeout(() => { scanning.value = false }, 12000)
}

function pair(addr: string) {
  edge.send('bt_pair', { address: addr })
  message.info(`正在配对 ${addr}...`)
}

function connect(addr: string) {
  edge.send('bt_connect', { address: addr })
  message.info(`正在连接 ${addr}...`)
}

function disconnect() {
  edge.send('bt_disconnect')
  message.info('正在断开蓝牙...')
}
</script>

<template>
  <n-card title="蓝牙设备">
    <template #header-extra>
      <n-space>
        <n-tag v-if="edge.btStatus.connected" type="success" size="small">已连接</n-tag>
        <n-button size="small" @click="scan" :loading="scanning" :disabled="scanning">
          扫描
        </n-button>
        <n-button v-if="edge.btStatus.connected" size="small" type="warning" @click="disconnect">
          断开
        </n-button>
      </n-space>
    </template>

    <n-list v-if="edge.btDevices.length > 0">
      <n-list-item v-for="dev in edge.btDevices" :key="dev.address">
        <n-space align="center" justify="space-between">
          <div>
            <n-text strong>{{ dev.name || dev.address }}</n-text>
            <br>
            <n-text depth="3" style="font-size: 12px;">{{ dev.address }}</n-text>
          </div>
          <n-space>
            <n-button size="tiny" @click="pair(dev.address)">配对</n-button>
            <n-button size="tiny" type="primary" @click="connect(dev.address)">连接</n-button>
          </n-space>
        </n-space>
      </n-list-item>
    </n-list>
    <n-text v-else depth="3">点击扫描发现附近的蓝牙设备</n-text>
  </n-card>
</template>
```

---

### Task 15: Vue 前端 — 创建 SensorDashboard.vue

**Files:**
- Create: `InnoArkEdge/frontend/src/components/sensor/SensorDashboard.vue`

- [ ] **Step 1: 创建 SensorDashboard.vue**

```vue
<script setup lang="ts">
import { onMounted, ref, onBeforeUnmount } from 'vue'
import {
  NCard, NGrid, NGridItem, NStatistic, NButton, NTag, NSpace, NText, NLog,
} from 'naive-ui'
import { useEdgeStore } from '../../stores/edge'

const edge = useEdgeStore()
const eventLog = ref<string[]>([])
let logTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  edge.send('wifi_status')
  edge.send('bt_status')

  // 每 5 秒追加一条日志
  logTimer = setInterval(() => {
    const d = edge.sensorData
    const line = `[${new Date().toLocaleTimeString()}] HR:${d.hr} HRV:${d.hrv} 注意力:${(d.attention * 100).toFixed(0)}% 人脸:${d.faceCount}${d.rfidCard ? ` RFID:${d.rfidCard}` : ''}`
    eventLog.value.unshift(line)
    if (eventLog.value.length > 100) eventLog.value.pop()
  }, 5000)
})

onBeforeUnmount(() => {
  if (logTimer) clearInterval(logTimer)
})
</script>

<template>
  <n-grid :cols="4" :x-gap="12" :y-gap="12">
    <n-grid-item span="1">
      <n-card size="small">
        <n-statistic label="心率" :value="edge.sensorData.hr" suffix="bpm" />
      </n-card>
    </n-grid-item>
    <n-grid-item span="1">
      <n-card size="small">
        <n-statistic label="HRV" :value="edge.sensorData.hrv" suffix="ms" :precision="1" />
      </n-card>
    </n-grid-item>
    <n-grid-item span="1">
      <n-card size="small">
        <n-statistic label="注意力" :value="(edge.sensorData.attention * 100).toFixed(0)" suffix="%" />
      </n-card>
    </n-grid-item>
    <n-grid-item span="1">
      <n-card size="small">
        <n-statistic label="人脸数" :value="edge.sensorData.faceCount" />
      </n-card>
    </n-grid-item>
  </n-grid>

  <n-card title="传感器状态" style="margin-top: 12px;">
    <n-space>
      <n-tag :type="edge.sensorStatus.ble === 'connected' ? 'success' : 'default'">
        BLE: {{ edge.sensorStatus.ble }}
      </n-tag>
      <n-tag :type="edge.sensorStatus.camera === 'connected' ? 'success' : 'default'">
        Camera: {{ edge.sensorStatus.camera }}
      </n-tag>
      <n-tag :type="edge.sensorStatus.rfid === 'connected' ? 'success' : 'default'">
        RFID: {{ edge.sensorStatus.rfid }}
      </n-tag>
    </n-space>
  </n-card>

  <n-card title="事件日志" style="margin-top: 12px;">
    <n-log :rows="8" :log="eventLog.join('\n')" />
  </n-card>
</template>
```

---

### Task 16: Vue 前端 — 创建 Devices.vue 页面 + 修改路由 + 修改 Layout

**Files:**
- Create: `InnoArkEdge/frontend/src/views/Devices.vue`
- Modify: `InnoArkEdge/frontend/src/router/index.ts`
- Modify: `InnoArkEdge/frontend/src/components/Layout.vue`

- [ ] **Step 1: 创建 Devices.vue**

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { NTabs, NTabPane, NButton } from 'naive-ui'
import { useEdgeStore } from '../stores/edge'
import WifiPanel from '../components/sensor/WifiPanel.vue'
import BluetoothPanel from '../components/sensor/BluetoothPanel.vue'
import SensorDashboard from '../components/sensor/SensorDashboard.vue'

const edge = useEdgeStore()
const tab = ref('sensors')

onMounted(() => {
  edge.connect()
})
</script>

<template>
  <n-tabs v-model:value="tab" type="line" animated>
    <n-tab-pane name="sensors" tab="传感器">
      <sensor-dashboard />
    </n-tab-pane>
    <n-tab-pane name="wifi" tab="WiFi">
      <wifi-panel />
    </n-tab-pane>
    <n-tab-pane name="bluetooth" tab="蓝牙">
      <bluetooth-panel />
    </n-tab-pane>
  </n-tabs>
</template>
```

- [ ] **Step 2: 修改 router/index.ts — 添加 /devices 路由**

在 `routes` 数组的 children 中添加：

```typescript
      { path: 'devices', name: 'Devices', component: () => import('../views/Devices.vue') },
```

放在 settings 之前或之后。

- [ ] **Step 3: 修改 Layout.vue**

在 header 的 user-trigger 前面添加 SensorStatus 组件：

```vue
      <!-- 传感器状态（放在 user-trigger 前面） -->
      <sensor-status />
```

并修改 script 引入：

```typescript
import SensorStatus from './sensor/SensorStatus.vue'
```

同时在 `studentMenu`、`teacherMenu`、`managerMenu` 中添加设备管理菜单项：

```typescript
  { key: '/devices', title: '设备', icon: HardwareChipOutline },
```

从 `@vicons/ionicons5` 引入 `HardwareChipOutline`，或者复用已有图标如 `SettingsOutline`。

- [ ] **Step 4: 验证前端构建**

```bash
cd InnoArkEdge/frontend
npm install
npm run build
```

预期：构建成功，`dist/` 目录生成。

---

### Task 17: 部署脚本 — nginx + systemd + kiosk.sh + install.sh

**Files:**
- Create: `InnoArkEdge/nginx/innoark.conf`
- Create: `InnoArkEdge/scripts/kiosk.sh`
- Create: `InnoArkEdge/scripts/innoark-edge.service`
- Create: `InnoArkEdge/scripts/innoark-kiosk.service`
- Create: `InnoArkEdge/scripts/install.sh`

- [ ] **Step 1: 创建 nginx/innoark.conf**

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
        proxy_set_header Host $host;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
    }
}
```

- [ ] **Step 2: 创建 scripts/kiosk.sh**

```bash
#!/bin/bash
# InnoArk Kiosk 启动脚本
xset s off
xset -dpms
xset s noblank
unclutter -idle 0 &

chromium-browser --kiosk \
  --no-first-run \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --touch-events=enabled \
  --check-for-update-interval=604800 \
  http://localhost
```

- [ ] **Step 3: 创建 scripts/innoark-edge.service**

```ini
[Unit]
Description=InnoArk Edge Terminal Service
After=network.target

[Service]
Type=simple
ExecStart=/opt/innoark-edge/venv/bin/python /opt/innoark-edge/main.py
WorkingDirectory=/opt/innoark-edge
Restart=always
RestartSec=5
StartLimitInterval=200
StartLimitBurst=10
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
```

- [ ] **Step 4: 创建 scripts/innoark-kiosk.service**

```ini
[Unit]
Description=InnoArk Kiosk Mode
After=innoark-edge.service
Requires=innoark-edge.service

[Service]
Type=simple
ExecStart=/usr/bin/startx /opt/innoark-edge/scripts/kiosk.sh -- :0 vt1
Restart=always
User=creeper
StandardInput=tty
TTYPath=/dev/tty1

[Install]
WantedBy=multi-user.target
```

- [ ] **Step 5: 创建 scripts/install.sh**

```bash
#!/bin/bash
# InnoArkEdge 树莓派安装脚本
set -e

INSTALL_DIR=/opt/innoark-edge
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "[Install] Installing InnoArkEdge to $INSTALL_DIR..."

# 1. 安装系统依赖
sudo apt update
sudo apt install -y \
  xserver-xorg-core xinit xinput unclutter \
  chromium-browser nginx \
  network-manager bluez bluetooth python3-venv python3-pip

# 2. 复制代码
sudo mkdir -p "$INSTALL_DIR"
sudo cp -r "$REPO_DIR/frontend/dist" "$INSTALL_DIR/frontend/dist"
sudo cp -r "$REPO_DIR/backend" "$INSTALL_DIR/backend"
sudo cp -r "$REPO_DIR/edge" "$INSTALL_DIR/edge"
sudo cp "$REPO_DIR/main.py" "$INSTALL_DIR/main.py"
sudo cp "$REPO_DIR/requirements.txt" "$INSTALL_DIR/requirements.txt"
sudo cp -r "$REPO_DIR/nginx" "$INSTALL_DIR/nginx"
sudo cp -r "$REPO_DIR/scripts" "$INSTALL_DIR/scripts"
chmod +x "$INSTALL_DIR/scripts/kiosk.sh"

# 3. Python 虚拟环境
python3 -m venv "$INSTALL_DIR/venv"
"$INSTALL_DIR/venv/bin/pip" install -r "$INSTALL_DIR/requirements.txt"

# 4. nginx 配置
sudo cp "$INSTALL_DIR/nginx/innoark.conf" /etc/nginx/sites-available/innoark
sudo ln -sf /etc/nginx/sites-available/innoark /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo systemctl restart nginx

# 5. systemd 服务
sudo cp "$INSTALL_DIR/scripts/innoark-edge.service" /etc/systemd/system/
sudo cp "$INSTALL_DIR/scripts/innoark-kiosk.service" /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable innoark-edge innoark-kiosk

# 6. 数据目录
mkdir -p "$INSTALL_DIR/data"

echo "[Install] Done! Reboot to start: sudo reboot"
```

- [ ] **Step 6: 提交全部**

```bash
cd c:\Users\ABCDCreeper\Documents\Projects\InnoArkEdge
git add -A
git commit -m "feat: full InnoArkEdge edge terminal implementation

- Edge Python backend: BLE/Camera/RFID sensors + WebSocket + WiFi/BT managers
- Vue frontend: Devices page with WiFi/BT/Sensor panels + global status bar
- Deployment: nginx config, systemd services, Kiosk script, install script
- Unified main.py with asyncio event loop for Flask + sensor pipeline"
```