# 网络链路知识手册

> 以「PicGo 上传 GitHub 失败」为案例，从一次真实故障切入，讲清 DNS → 代理 → TCP → TLS → HTTP 的完整链路。
>
> 案例时间：2026-10-08　案例机器：Windows + PicGo + FlClash + Steamcommunity302

---

## 0. 案例速览

### 0.1 故障现象

PicGo 上传图片到 GitHub 图床失败，两次报错**完全不同**：

| 时刻 | 报错 | 层次 |
|---|---|---|
| 00:11 | `unable to get local issuer certificate` | TLS 层 |
| 16:46 | `connect ECONNREFUSED 127.0.0.1:443` | TCP 层 |

两次都是 `statusCode: 0`、`body: ""`。

### 0.2 一句话本质

**本机上的加速工具 Steamcommunity302 劫持了 `api.github.com`，用自签证书冒充 GitHub；浏览器信任它的证书所以能上网，而 PicGo（Node.js）不信任，所以失败。**

### 0.3 关键事实清单

| 事实 | 实测值 |
|---|---|
| hosts 中 `api.github.com` | `127.0.0.1` |
| hosts 总条目 | 945 条指向 `127.0.0.1` |
| hosts 管理者 | `C:\Users\March\AppData\Roaming\Steamcommunity_302.exe` |
| 真实 GitHub IP | `20.205.243.168`（微软 Azure） |
| 真实 IP 的 443 | ✅ 可达（`True`） |
| 真实证书链 | ✅ 完整（`authorized = true`） |
| 本机 443 服务 | Steamcommunity302（Caddy 反向代理） |
| 本机 443 证书签发者 | `CN=Steamcommunity302 - ECC Intermediate` |
| 该根证书 | `CN=Steamcommunity302 - 2026 ECC Root`，指纹 `9E233F6080D99EA8D37F9D2D60DDC6477935A156` |
| 根证书安装位置 | Windows `LocalMachine\Root` + `CurrentUser\Root` |
| FlClash 代理端口 | `127.0.0.1:7890`（正向代理） |
| Node 内置根证书数 | 144 张（不含 Steamcommunity302） |

---

## 1. 全景链路图

一次网络请求要穿过这些层。**自下而上排查，第一个失败的层就是病根。**

```
┌──────────────────────────────────────────────────────────────┐
│ ⑦ 应用层    PicGo → axios → PUT 请求                          │
├──────────────────────────────────────────────────────────────┤
│ ⑥ 名字解析  hosts 文件 → DNS 缓存 → DNS 服务器                 │
│             ↓ 递归查询：根 → TLD → 权威 NS                     │
│             ↓ GeoDNS / Anycast / TTL                          │
├──────────────────────────────────────────────────────────────┤
│ ⑤ 代理层    ┌─ 正向代理（代表客户端）                          │
│             └─ 反向代理（代表服务器）                          │
├──────────────────────────────────────────────────────────────┤
│ ④ 传输层    TCP 三次握手（端口 443）                           │
├──────────────────────────────────────────────────────────────┤
│ ③ 加密层    TLS 握手 + 证书链验证                              │
├──────────────────────────────────────────────────────────────┤
│ ② 网络层    IP 路由 / NAT / 防火墙                             │
├──────────────────────────────────────────────────────────────┤
│ ① 链路层    网卡 / Wi-Fi / 光猫 / 运营商                       │
└──────────────────────────────────────────────────────────────┘
```

**重要：DNS 在 TCP 之前。** 这解释了为什么底层（解析）出问题，会在高层（证书）报错。

---

## 2. 知识点一：域名解析链路（DNS）

### 2.1 解析顺序

| 顺序 | 环节 | 说明 |
|---|---|---|
| ① | 本机主机名 | 判断是否访问自己 |
| ② | **hosts 文件** | 本地静态映射，**优先于 DNS 服务器** |
| ③ | DNS 客户端缓存 | 受 TTL 控制 |
| ④ | DNS 服务器 | 真正的网络查询 |

> **关键**：hosts 命中就**直接返回**，不再问 DNS 服务器。这是**所有程序**的通用行为（浏览器也一样），不是某个语言或框架的特性。

### 2.2 递归查询链路

```
你的电脑
   │ ① 问：api.github.com 的 IP？
   ▼
递归解析器（运营商 DNS，本案例 222.201.54.123）
   │ ② 问根服务器 .
   ▼
根服务器 ──► "去问 .com 的 TLD"
   │ ③ 问 .com TLD
   ▼
TLD ──► "github.com 的权威 NS 是这些"
   │ ④ 问权威 NS
   ▼
权威 NS ──► "api.github.com = 20.205.243.168"
   │ ⑤ 逐级返回并缓存（按 TTL）
   ▼
拿到 IP
```

### 2.3 三个进阶概念

| 概念 | 含义 |
|---|---|
| **GeoDNS / GSLB** | 权威 DNS 按来源 IP 判断位置，返回最近数据中心的 IP。所以同一域名不同时间解析结果可能变（本案例实测过 `20.27.177.116` 和 `20.205.243.168`） |
| **Anycast** | 同一 IP 在全球多处宣告，靠 BGP 把你导向最近节点。常用于根 DNS、CDN |
| **TTL** | 缓存存活时间。短 TTL 便于故障时快速切流 |

### 2.4 GitHub 的 DNS 架构

`github.com` 的权威 NS 是**双供应商冗余**：

| 供应商 | 服务器 |
|---|---|
| NS1 | `dns1.p08.nsone.net` ~ `dns4.p08.nsone.net` |
| AWS Route 53 | `ns-421.awsdns-52.com`、`ns-520.awsdns-01.net` 等 |

### 2.5 本案例对照

```powershell
Resolve-DnsName api.github.com -Type A            # → 127.0.0.1      （走 hosts）
Resolve-DnsName api.github.com -Type A -DnsOnly   # → 20.205.243.168 （绕过 hosts）
```

> **`-DnsOnly` 是排查这类问题的核心技巧**：用来区分"是 hosts 干的"还是"是 DNS 服务器干的"。两者结论完全不同。

---

## 3. 知识点二：监听表 —— "有没有程序在听"

### 3.1 机制

操作系统内核维护一张**监听表**，记录"哪个进程在哪个 (IP, 端口) 上等连接"。只有程序主动注册（`listen()`）才会出现。

```
内核监听表（简化）
┌──────────────────────┬────────────────────┐
│     (IP, 端口)        │      进程           │
├──────────────────────┼────────────────────┤
│ 0.0.0.0:135          │ svchost            │
│ 127.0.0.1:443        │ Steamcommunity302  │  ← 本案例关键行
│ 127.0.0.1:7890       │ FlClash            │
│ 127.0.0.1:36677      │ PicGo Server       │
└──────────────────────┴────────────────────┘
```

没有对应行 → 内核直接回 RST → 应用收到 `ECONNREFUSED`。**数据包根本没离开本机。**

### 3.2 核心对比：目的地 vs 中转站

**同样是 `127.0.0.1`，含义可以完全相反：**

| 场景 | 地址角色 | 结果 |
|---|---|---|
| hosts 把域名指到 `127.0.0.1:443` | **目的地**（终点） | 取决于那里有没有服务。没有则**死路** |
| 代理设置填 `127.0.0.1:7890` | **中转站**（出口） | 有代理程序在等 → **能通往外部** |

> **比喻**
> - hosts 把"GitHub 公司"的地址改写成"你家 443 房间"→ 你去了自己家，**这是终点**
> - 代理是"你家门口的快递代收点"→ 交给它，它再送出去，**这是出口**

### 3.3 为什么"本地地址"也能上网

代理程序的完整链路：

```
你的程序 ──► 127.0.0.1:7890（本机代理进程）
                  │  交出【域名】
                  ▼
             加密隧道连到远程代理服务器
                  │
                  ▼
             远程服务器去连真正的目标
```

**本机代理进程只是"入口"，真正的出口在远程服务器。**

### 3.4 本案例对照

| 端口 | 16:46 | 排查时 | 结果 |
|---|---|---|---|
| `127.0.0.1:443` | ❌ 无人监听 | ✅ Steamcommunity302 在听 | 连接被拒 → 连上但证书不可信 |
| `127.0.0.1:7890` | ❌ | ✅ FlClash 在听 | 代理可用 |

> **报错变化不是网络变了，是"443 房间里有没有人"变了。**

### 3.5 工具选择的坑

| 工具 | 可靠性 |
|---|---|
| `netstat -ano` | ✅ 可靠 |
| `Test-NetConnection IP -Port N` | ✅ 可靠 |
| `Get-NetTCPConnection` | ⚠️ 本案例中返回错误结果（连自己在听的端口都报无监听），不可单独采信 |

---

## 4. 知识点三：代理的两种形态（重点）

这是最容易混淆的部分。**判断标准只有一个：它代表谁？**

### 4.1 正向代理（Forward Proxy）—— 代表客户端

```
客户端                     正向代理                   目标服务器
PicGo  ──►  127.0.0.1:7890  ──►  远程代理节点  ──►  api.github.com
   │                              │
   │ ① 客户端【主动配置】它        │ ② 代理替客户端出去
   │ ③ 客户端知道它在中间          │ ④ 目标服务器不知道真实客户端
```

**特征**
- 客户端**必须主动配置**（或读环境变量）
- 代表**客户端**的利益
- 目标服务器看到的是代理的 IP，不是你的

**本案例**：`FlClash`（`D:\FlClash`，监听 `127.0.0.1:7890`）就是正向代理。

**关键优势**：客户端把**域名**交给它（`CONNECT api.github.com:443`），由代理自己解析 → **可以绕开本机 hosts 劫持**。

### 4.2 反向代理（Reverse Proxy）—— 代表服务器

```
客户端                     反向代理                   真实服务器
PicGo  ──►  127.0.0.1:443  ──►  ...转发...  ──►  api.github.com
   │                            │
   │ ① 客户端【不知道】它的存在    │ ② 代理替服务器接客
   │ ③ 客户端以为它就是目标        │ ④ 真实服务器藏在后面
```

**特征**
- 客户端**完全无感**，不需要也不应该配置它
- 代表**服务器**的利益
- 客户端以为自己在直连目标

**本案例**：`Steamcommunity302` 在本机 443 起的 Caddy 服务，冒充 `api.github.com` 接客。

### 4.3 对比总表

| 维度 | 正向代理 | 反向代理 |
|---|---|---|
| 代表谁 | **客户端** | **服务器** |
| 客户端是否感知 | ✅ 需主动配置 | ❌ 完全无感 |
| 部署位置 | 客户端侧（或本地） | 服务器侧（或本地冒充） |
| 客户端看到的目标 | 代理 | 以为是真的目标 |
| 典型用途 | 科学上网、企业出口、缓存 | 负载均衡、SSL 卸载、CDN、**本地加速** |
| 本案例 | FlClash（7890） | Steamcommunity302（443） |

### 4.4 隧道型 vs 中间人型（正交的另一个维度）

代理还可以按"是否偷看内容"分类：

| 类型 | 原理 | 客户端能否察觉 |
|---|---|---|
| **隧道型（CONNECT）** | 只转发 TCP 字节流，**端到端加密**，代理看不到明文 | 证书是**真的**，无法察觉 |
| **中间人型（MITM）** | 用**自签证书冒充**目标，解密后再转发 | 证书是**假的**，可被察觉 |

```
隧道型：
  PicGo ══加密══╗                    ╔══加密══ 真实 GitHub
                ╚══ 代理只搬字节 ══╝
  → 证书链是真的（*.github.com ← Sectigo ← USERTrust）→ Node 天然信任 ✅

中间人型：
  PicGo ══加密══╗                    ╔══加密══ 真实 GitHub
                ╚══ 代理解密再加密 ══╝
                    ↑ 出示【自己签的】假证书
  → 证书链是假的（{} ← Steamcommunity302 - ECC Intermediate）→ Node 不信任 ❌
```

> **本案例的核心矛盾就在这里。** FlClash 是「正向 + 隧道型」，Steamcommunity302 是「反向 + 中间人型」。

### 4.5 本地加速工具的原理（hosts + 反向代理）

Steamcommunity302 这类工具靠**三步组合拳**工作：

```
① 改写 hosts：api.github.com → 127.0.0.1
        │  让请求先送到本机
        ▼
② 在本机 80/443 起 HTTPS 服务器（Caddy）
        │  用【自签证书】冒充目标
        ▼
③ 收到请求后转发给真实站点
        │  由它选择可用的网络路径出去
        ▼
④ 把自签根证书装进 Windows 信任库
        │  让浏览器不报警
        ▼
   浏览器正常，但只信任 Windows 证书库的程序（如 Node）会失败
```

> **所以 hosts 条目和"代理"确实有关**——是这个反向代理工具写的。
> 但和**正向代理**（FlClash）无关，正向代理从不改 hosts。

### 4.6 两类工具是否改 hosts

| 代理类型 | 是否改 hosts | 原因 |
|---|---|---|
| **正向代理** | ❌ 不改 | 靠"客户端把域名交给我"工作，不需要劫持解析 |
| **反向代理（本地加速）** | ✅ 必须改 | 必须让请求先到本机，才能接住 |

---

## 5. 知识点四：TCP 三次握手

```
客户端                          服务器 (20.205.243.168:443)
   │  ① SYN  seq=x          ──────►  "我想连你"
   │  ② SYN+ACK seq=y,ack=x+1 ◄────  "可以"
   │  ③ ACK  ack=y+1        ──────►  "开始吧"
   ▼
连接建立 → 进入 TLS 握手
```

### 常见报错

| 报错 | 含义 | 本案例 |
|---|---|---|
| `ECONNREFUSED` | 连上了但对面拒绝 | ✅ 16:46 的情况（`127.0.0.1:443` 无人监听） |
| `ETIMEDOUT` | 握手包被丢弃（防火墙静默丢包） | — |
| `ENETUNREACH` | 路由不可达 | — |
| `ECONNRESET` | 连接被强制重置 | ✅ 通过 FlClash 建隧道后遇到 |

---

## 6. 知识点五：TLS 握手与证书链

### 6.1 握手链路（TLS 1.3）

```
客户端                                    服务器
  │ ClientHello                            │
  │  ├ SNI: api.github.com  ← 明文！       │
  │  ├ ALPN: h2, http/1.1                  │
  │  ├ 支持的加密套件                       │
  │  └ key_share (ECDHE 公钥)               │
  │ ──────────────────────────────────────► │
  │ ◄────────────────────────────────────── │
  │ ServerHello + 证书链 + Finished          │
  │ 双方用 ECDHE 算出相同会话密钥             │
  ▼ 之后全部加密
```

> **SNI 是明文的**——这是 GFW 能用 SNI 阻断的原因，也是代理能知道你要连哪个域名的原因。

### 6.2 证书链结构

```
根 CA 证书（预装在客户端信任库，不传输）
    ↑ 签发
中间 CA 证书（服务器发给你）
    ↑ 签发
网站证书（服务器发给你）
```

**真实 GitHub 的链（本案例实测）：**

| 层 | 主体 | 签发者 |
|---|---|---|
| [0] | `*.github.com` | Sectigo Public Server Authentication CA DV E36 |
| [1] | Sectigo ... CA DV E36 | Sectigo ... Root E46 |
| [2] | Sectigo ... Root E46 | USERTrust ECC Certification Authority |
| [3] | **USERTrust ECC Certification Authority** | 自己（自签名，在信任库里） |

结果：`authorized = true` ✅

**Steamcommunity302 的链（本案例实测）：**

| 层 | 主体 | 签发者 |
|---|---|---|
| [0] | `{}`（空主体） | `CN=Steamcommunity302 - ECC Intermediate` |
| 根 | — | `CN=Steamcommunity302 - 2026 ECC Root` |

结果：`authorized = false`，错误 `UNABLE_TO_GET_ISSUER_CERT_LOCALLY` ❌

### 6.3 验证检查项

| 检查项 | 失败报错 |
|---|---|
| 能否构建到**受信任根** | `unable to get local issuer certificate` |
| 是否过期/未生效 | `certificate has expired` |
| 域名是否匹配 SAN | `Hostname/IP does not match ...` |
| 签名是否有效 | `self signed certificate` |
| 是否被吊销 | `certificate revoked` |

### 6.4 本案例的本质：证书信任库不同

**这是整个故障的核心，值得单独记住：**

| 程序 | 信任库 | 信任 302 的证书？ |
|---|---|---|
| **浏览器**（Chrome/Edge） | **Windows 证书存储区** | ✅ 信任 → **能上网** |
| **PicGo / Node.js / Electron** | **自己内置的 Mozilla 根证书库** | ❌ **不信任** → 报错 |

> **Node.js 完全不读 Windows 证书存储区**，除非用 `NODE_EXTRA_CA_CERTS` 环境变量额外指定。

```javascript
require('tls').rootCertificates.length   // → 144（本案例）
process.env.NODE_EXTRA_CA_CERTS          // → undefined
```

**这解释了「浏览器能打开 GitHub，PicGo 却上传失败」的全部原因。** 不是网络问题，不是 Token 问题，是信任库不同。

---

## 7. 知识点六：HTTP 与 statusCode 0

### 7.1 请求本身

```
PUT https://api.github.com/repos/{owner}/{repo}/contents/{path}
Authorization: token ghp_...
Body: {"message":"...","content":"<base64>","branch":"main"}
```

- 这是 GitHub **Contents API**
- 图片 **base64 编码后塞进 JSON body**，不是 multipart
- 请求体比原图大 ~33%

### 7.2 statusCode 0 的含义

> **`statusCode: 0` 是 axios 在"根本没收到任何 HTTP 响应"时的占位值。**

**推论很硬：只要 statusCode 是 0，请求就一定没到达应用层。** 真到了服务器，至少有 4xx/5xx。

| 现象 | 结论 |
|---|---|
| `statusCode: 0` + `body: ""` | 请求在连接阶段就断了 |
| `statusCode: 401` | 到达了，Token 有问题 |
| `statusCode: 404` | 到达了，仓库/路径有问题 |

---

## 8. 知识点七：CDN 不是独立的一层

CDN 是**部署架构**，由三个机制组合而成：

```
① GeoDNS / Anycast  → 导向最近边缘节点（DNS 层 + IP 路由层）
② 边缘节点缓存       → 静态内容直接返回（HTTP 层）
③ 回源 + 负载均衡    → 缓存未命中时回源站
```

### 按流量类型区分

| 流量 | 走什么 | 本案例实测 |
|---|---|---|
| **API**（`api.github.com`） | 动态请求，**几乎不缓存**，走负载均衡/边缘接入 | `20.205.243.168`（Azure） |
| **静态资源**（`raw.githubusercontent.com`） | 真正的 CDN，强缓存 | — |

> **关键结论：CDN 再快也救不了 DNS 劫持**，因为 CDN 的入口本身靠 DNS 找到。

---

## 9. 知识点八：系统代理 vs 应用代理

| 代理配置来源 | 谁读它 |
|---|---|
| 系统代理（注册表 Internet Settings） | 浏览器、部分系统组件 |
| PAC 脚本（`AutoConfigURL`） | 浏览器 |
| 环境变量 `HTTP_PROXY` / `HTTPS_PROXY` | 部分命令行工具、Node 生态 |
| **应用自己的设置项** | 各应用独立实现 |

> **Node.js 默认完全不读系统代理。**
>
> 所以「我系统代理开了」≠「这个程序走代理」。
>
> **本案例**：用户开了系统代理，浏览器正常，但 PicGo 的 `settings` 里从未配置过"上传代理"（只有 `npmProxy`，那是插件安装用的），所以 PicGo 始终直连。

---

## 10. 分层排查方法论（可复用）

**自下而上逐层验证，第一个失败的层就是病根。**

| 层 | 命令 | 判断依据 |
|---|---|---|
| DNS | `Resolve-DnsName 域名 -Type A` | 解析对不对 |
| DNS 对比 | 同上加 `-DnsOnly` | 区分 hosts 还是 DNS 服务器 |
| 监听 | `netstat -ano \| findstr :443` | 本机有没有程序在听 |
| TCP | `Test-NetConnection 域名 -Port 443` | 端口通不通 |
| TLS | `curl -v` / Node `tls.connect` | 握手成不成功、证书谁签的 |
| HTTP | `curl -I` | 状态码多少 |

### 核心心法

> **报错信息是现象，不是结论。**

本案例中 `unable to get local issuer certificate` 听起来是证书问题，实际病根在 DNS 解析层。若盲目去装根证书、配 `NODE_EXTRA_CA_CERTS`，会全部无效，因为病根在下面四层。

### 用真实 IP 绕过 hosts 验证

```powershell
# 拿真实 IP 后直接测，可同时排除 hosts 与 DNS 干扰
Test-NetConnection 20.205.243.168 -Port 443
```

---

## 11. 本案例完整复盘

### 11.1 时间线

| 时刻 | Steamcommunity302 | 现象 |
|---|---|---|
| **00:11** | ✅ 运行中，443 有服务 | 握手成功，但出示自签证书 → Node 报 `unable to get local issuer certificate` |
| **16:46** | ❌ 未运行，443 无人监听 | 连不上 → `ECONNREFUSED 127.0.0.1:443` |
| **19:35 / 20:16** | ✅ 重新启动，**两次重写 hosts** | 443 恢复监听，报错回到证书错误 |

> hosts 修改时间在排查期间从 `19:35:35` 变到 `20:16:56`，文件从 5.9KB 涨到 **38.6KB / 991 行**——证明工具在**持续重写** hosts。所以**手动删除条目会被覆盖**。

### 11.2 因果链

```
Steamcommunity302 改写 hosts
   → api.github.com 解析成 127.0.0.1
   → PicGo 直连本机 443（因为没配代理）
   → 302 用自签证书冒充 GitHub
   → Node 的信任库里没有 302 的根证书
   → UNABLE_TO_GET_ISSUER_CERT_LOCALLY
   → axios statusCode 0 → PicGo 上传失败
```

### 11.3 为什么浏览器行、PicGo 不行

```
同一个请求，两条路：

浏览器 ──► 读 Windows 证书库 ✅ 信任 302 的证书 ──► 成功
PicGo  ──► 读 Node 内置证书库 ❌ 不信任       ──► 失败
```

### 11.4 解决方案对比

| 方案 | 做法 | 优点 | 缺点 |
|---|---|---|---|
| **A. PicGo 配正向代理** | 设置 → 上传代理 → `http://127.0.0.1:7890` | 不做中间人，真证书直通 | 需 FlClash 常驻 |
| **B. 让 Node 信任 302** | 设 `NODE_EXTRA_CA_CERTS` 指向导出的 crt，重启 PicGo | 保留加速 | 需配环境变量；MITM 有安全隐患 |
| **C. 302 里取消 GitHub 加速** | 工具界面移除 GitHub | **最干净**，且直连实测可用 | 需操作该工具 |
| **D. 关掉 302** | 不再加速 | 最简单 | 失去 Steam 等加速 |

**推荐 C**：已实测直连 GitHub 完全可用（TCP `True`、证书链 `authorized = true`），直连既无中间人也无额外依赖。

---

## 12. 常见误区（本次对话中纠正过的）

| 误区 | 纠正 |
|---|---|
| "报证书错误 → 去装根证书" | 先分层排查。本案例病根在 DNS 层 |
| "hosts 和代理无关" | 与**正向代理**无关，但**反向代理型加速工具必须改 hosts** |
| "Node 看到 hosts 就不去 DNS，是 Node 的毛病" | hosts 优先是**所有程序**的通用行为。差别在于**走不走代理** |
| "代理地址也是 127.0.0.1，和 hosts 指过去不是一样吗" | 不同：hosts 指过去是**终点**（死路），代理是**中转站**（出口） |
| "系统代理开了，程序就走代理" | **Node/Electron 默认不读系统代理** |
| "statusCode 0 是服务器返回的错误码" | 0 = **根本没收到 HTTP 响应**，请求没到应用层 |
| "IP 会变，说明 DNS 不稳定" | 可能是正常 **GeoDNS / Anycast** 行为 |
| "删掉 hosts 条目就修好了" | 本案例中工具会**持续重写** hosts，需从工具层面解决 |

---

## 13. 速查表

### 13.1 命令速查

```powershell
# DNS 解析（含 hosts）
Resolve-DnsName api.github.com -Type A

# DNS 解析（绕过 hosts）——区分 hosts 还是 DNS 服务器
Resolve-DnsName api.github.com -Type A -DnsOnly

# 本机监听端口（可靠）
netstat -ano | findstr LISTENING

# 端口连通性
Test-NetConnection 20.205.243.168 -Port 443

# 观察完整握手（可指定 IP 绕过 hosts）
curl.exe -v --resolve api.github.com:443:20.205.243.168 https://api.github.com

# 查看 Windows 证书库中的可疑根证书
Get-ChildItem Cert:\LocalMachine\Root | Where-Object { $_.Subject -match 'Steam|302|Caddy' }

# 查看本机 443 提供的证书（Node 与 PicGo 同源实现）
node -e "const t=require('tls');const s=t.connect({host:'127.0.0.1',port:443,servername:'api.github.com',rejectUnauthorized:false},()=>{console.log(JSON.stringify(s.getPeerCertificate().issuer));console.log(s.authorizationError);s.end()})"
```

### 13.2 报错 → 病根速查

| 报错 | 最可能的病根 |
|---|---|
| `ECONNREFUSED 127.0.0.1:443` | hosts 劫持 + 本机无监听 |
| `unable to get local issuer certificate` | 中间人证书，或 Node 不信任 Windows 里的自签根证书 |
| `ETIMEDOUT` | 防火墙静默丢包 / 网络不可达 |
| `ECONNRESET` | 连接被重置（代理节点异常、环路等） |
| `statusCode: 0` + 空 body | 请求未到达应用层，问题在更底层 |
| `certificate has expired` | 证书过期或系统时钟错误 |

### 13.3 概念对照速查

| 概念 | 代表谁 | 客户端感知 | 改 hosts | 看得到明文 |
|---|---|---|---|---|
| 正向代理 | 客户端 | ✅ 需配置 | ❌ | 隧道型否 / 中间人型是 |
| 反向代理 | 服务器 | ❌ 无感 | ✅（本地加速） | 中间人型是 |
| CDN | 服务器 | ❌ 无感 | ❌ | 否 |

---

*文档生成时间：2026-10-08　配套证书文件：`Steamcommunity302-root.crt`*
