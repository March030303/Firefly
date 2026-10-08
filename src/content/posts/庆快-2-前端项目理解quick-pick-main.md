---
title: 庆快-2-前端项目理解（quick-pick-main）
published: 2026-09-24
description: 庆快前端的理解
tags:
  - 标签
category: 分类
images: images/
draft: false
---
# server层
## 理解

![233](https://cdn.jsdelivr.net/gh/March030303/Picgo@main/img/20260922172537514.png)
现在庆快前端项目过渡到server层，理解上：

1、generated文件夹：由后端决定的一个个js文件（以业务为界），可以import里面的方法。
是自动生成的（npm run api:gen），禁止手工修改——重新生成会整体替换目录，手改的内容会丢
>md原文： 分组按稳定的 URL 业务前缀判定，而不是直接把中文 Swagger tag 转成文件名。

也就是中文tag改个名无所谓，URL前缀才是契约。generated/manifest.json 记录了本次生成用的文档地址和接口总数（206个）
每个函数就干一件事「拼路径 → 发请求 → 解包 → 返回data」：
```js
export async function getByCategoryId(params = {}) {
  assertRequiredParams(params, ['categoryId'], 'getByCategoryId'); // 必填校验，缺了直接抛错
  const url = buildApiPath('/user/ic-space/list/{categoryId}', params, ['categoryId'], []);
  const response = await http.get(url);
  return unwrapData(response); // 校验code===1，只把业务data返回给页面
}
```

OpenAPI文档地址（生成器自动在base-url后面拼 /v3/api-docs）：
- 在线：https://bluefox-quick.online:8080/v3/api-docs
- 本地：http://localhost:8080/v3/api-docs（C端后端在8080，管理端才是8086，别搞混）


2、其他与generated文件夹同级的文件：
- core.js负责「校验 → 拼路径 → 挑参数 → 解包」这一整条链，被generated和手写文件共用。unwrapData负责拆包（校验code=1、抛message、返回data），另外还有必填校验、挑参数过滤空值、路径参数替换+查询参数序列化，一共四个工具

- api.js：统一出口。把generated/index.js和virtual-payment.js重新export成generatedApi/virtualPaymentApi两个命名空间，不创建任何新能力，只是「一站式入口」。实际全项目还没用它（只有README示例引用过）。它只在「运行时按业务域名字符串动态查接口」这种场景才有用，属于设计上保留的兜底入口。


- 种类1：是后端还没同步到openapi的接口我要用，就只能手写。等文档更新后跑一次api:gen，就会被generated替换掉
  - library.js：用的是新路径/user/library/spaces，而generated/ic-spaces.js还是旧路径/user/ic-space/*，过渡期手写顶着
  - dining.js、stall-page.js：同理
  - virtual-payment.js：特殊，支付涉及密钥，后端永远不进OpenAPI，是长期文件（也是唯一被收进api.js的手写文件）


- 种类2：多个业务js一起用，实现跨业务使用。准确说是「编排」：把多个接口的结果合并成一个新能力，而不是"A调B"（那直接import就行）
  - discovery.js（发现榜）：先打新接口/user/discovery/rank，404说明后端没部署→降级用analytics+stalls的generated接口拼旧榜单，并锁定5分钟内直接走旧接口（新旧后端可分批发布，不永久锁定旧接口）
  - search.js（校园搜索）：新接口返回旧格式数组时，Promise.allSettled并发打4个接口（小摊/食堂/商圈/图书馆）拼出校园目录，个别失败不炸整体


- 种类3：适配器legacy-response.js（迁移垫片）。方向别搞反：不是"generated太新想要旧的"，是旧页面太旧跟不上generated——generated返回解包后的data，旧页面还在读response.data.code和response.data.data。toLegacyResponse把新形状包回旧形状，旧页面一行不改就能用新接口，等旧页面迁移完它就删

```js
export async function toLegacyResponse(serverRequest) {
  const data = await serverRequest; // 新接口返回的已经是data
  return { statusCode: 200, data: { code: 1, data } }; // 包回旧形状
}
```

用法：`const res = toLegacyResponse(storesServer.getStoreList(params))`，homepage等旧页面都这么过渡。本质和core一样是工具，区别是core长期存在、它迁移完就删

## core.js
现在发现这个文件夹每个函数都很重要，特意拆开一节讲

### unwrapData

使用时
```
export const unwrapData = (response, fallback = null) => {

  const payload = response && response.data;
  //response成功的话拿到data，false拿不到。这里是防御性写法，如果response是null的话，直接const payload = response.data就是null.data了

  if (!payload || payload.code !== 1) {

    throw new Error((payload && (payload.message || payload.msg)) || '请求失败');

  }

  return payload.data === null || payload.data === undefined ? fallback : payload.data;
  //如果返回的是null或者undefined，返回fallback(默认参数是null，用的时候也可以传[]、{})

}
```
关于&&的写法：[[JS核心]]



不管怎么说，组件都是调用 server 里的方法来实现从后端拿数据渲染页面
```

.vue 页面/组件
   │
   │  import { xxx } from '@/server/...'
   ▼
server 层（不管 generated 还是手写）
   │
   │  http.get/post  (utils/request.ts 注入 token、处理 401 刷新)
   ▼
后端 /user/... 接口
```

# scripts层
>开发时工具，不参与线上运行。

scripts/api.js是Node命令行脚本（npm run api:gen跑它拉OpenAPI生成generated/），和server/api.js重名但完全不同——一个跑完就退出，一个运行时常驻。里面还有lint脚本、一次性迁移脚本、十几个*.test.cjs单测。规律：pages/components/server/utils是运行时目录，scripts/deploy/.husky是开发时目录，前端import路径里绝不会出现scripts/

# utils层

>[!tip]
>工具类这一章应该重点理解，培养工程思维
## config
### 理解与使用

config.ts 是全项目的「通讯录」——所有请求去哪儿，只有它说了算（单一数据源，改这一个文件=改全项目指向）

导出三个东西：
```ts
BASE_URL     // HTTP 基地址：登录、拉摊位列表等一问一答的请求
WS_BASE_URL  // WebSocket 基地址：由 BASE_URL 推导（http→ws）
SSE_BASE_URL // SSE 基地址：BASE_URL + '/user/sse'
```
#### 用云后端还是本地后端？
用本地后端的条件是很苛刻的！（除非像今天这样后端炸了，开发要用本地后端）
决定用不用本地后端的核心逻辑就是 L29-35 那段「本地覆盖」：读了 `.env.development` 里的 `VITE_API_BASE_URL`，**三个条件同时满足才用本地**：
```
const useLocal = import.meta.env.DEV && ENV_VERSION === 'develop' && Boolean(localBaseUrl);
```

| 条件                          | 何时成立                     | 防什么                                         |
| --------------------------- | ------------------------ | ------------------------------------------- |
| `import.meta.env.DEV`       | 编译期：点「运行」true，点「发行」false | 本地地址被打进正式包                                  |
| `ENV_VERSION === 'develop'` | 运行期：微信确认当前是开发版           | 带 localhost 的包被传出去（用户手机里 localhost 指用户自己手机） |
| `Boolean(localBaseUrl)`     | `.env.development` 存在且非空 | 没配置的人不受影响                                   |

双保险设计：编译期+运行期各查一次，确保 `localhost` 永远只出现在开发者自己的开发版里。之后还有一行正则校验格式（必须是 `http(s)://host[:port]`、不带路径），配错直接 `throw` 白屏报错——快速失败（Fail Fast），比运行时诡异 404 好查得多。

启用本地后端的操作步骤（2026-10 云端 8080 后端挂了那次）：
1. 建 `.env.development`，内容一行：`VITE_API_BASE_URL=https://localhost:8080`（本地后端是 https，纯 http 会 400；真机调试改局域网 IP）
2. HBuilderX 重新「运行到小程序模拟器」——环境变量是编译期注入的，改文件不重新编译不生效
3. 开发者工具：详情→本地设置→勾选「不校验合法域名…HTTPS 证书」（localhost 不在白名单+本地自签证书）
#### 使用
（就是把基地址export出去就好了嘛）
使用方面：（代码侧）：export 之后哪都能 `import { BASE_URL, SSE_BASE_URL } from '@/utils/config'`，页面自己不存地址。

### 学到的技术、知识点
#### import.meta

`import { x } from` 是导入代码；`import.meta` 长得像但完全是另一回事——**ES Module 语言标准**规定每个模块天生自带一个「元信息对象」。Vite 在它上面额外挂了个 `.env` 属性，把 `.env.*` 文件里 `VITE_` 开头的变量塞进去：

```ts
import.meta        // 语言自带（标准）
import.meta.env    // Vite 扩展（构建工具注入）
```

关键机制：编译期整个表达式被替换成字符串字面量，编译产物里已经没有「读环境文件」这个动作，运行时只是读普通字符串。对比：

| 写法 | 来路 | 何时有值 |
|---|---|---|
| `import { x } from` | 导入别的模块 | 运行时 |
| `import.meta` | 语言标准 | 天生就有 |
| `import.meta.env.XXX` | Vite 编译注入 | 编译期替换 |

#### “开关控制”的思想（useLocal）
```
const useLocal = import.meta.env.DEV && ENV_VERSION === 'develop' && Boolean(localBaseUrl);
```
困惑：都 `const` 了怎么还叫「开关」？——`const` 锁的是「本次赋值后不可再改」，不是「值永远相同」。`useLocal` 这行每次编译/运行都会**现场计算**：

- 开发构建：`true && true && true` → 开关开，走本地
- 发行构建：`DEV` 为 false，`&&` 短路（后面两个条件根本不执行）→ 开关关，走云端

像温度计：每次看一眼当场读数、读完固定，而不是出厂刻死。`const` 保证的是读数出来之后没人能篡改（没人能强行 `useLocal = false` 掰开关）。

附带两个工程细节：三个条件把「最便宜、最能一票否决」的编译期检查放第一个（利用短路省计算）；L35 三元表达式 `useLocal ? localBaseUrl : env.baseUrl` 做最终二选一。

#### 通信方式

一般 GET 一问一答就完事，但有时客户端和服务端要长期连接（websocket、sse），所以config文件export了3个基地址


三种通道对比：

| 通道        | 协议                                | 模式               | 项目用途                               |
| --------- | --------------------------------- | ---------------- | ---------------------------------- |
| HTTP      | `http(s)://`                      | 一问一答，问完断开（短连接）   | 登录、拉列表、搜索                          |
| WebSocket | `ws(s)://`，借 HTTP 握手后切协议          | 全双工「电话」，双向随时说    | 摊位页实时在线状态 `/ws/online/...`         |
| SSE       | 本质还是 HTTP（`enableChunked` 分块流式响应） | 单向「广播电台」，服务器→小程序 | 好友推荐推送 `friend_recommend`，30s 自动重连 |

（选择口诀：一问一答用 HTTP，双向聊天用 WebSocket，服务器单向广播用 SSE）

所以 config 要导出三个基地址；但真正的「源」只有 `BASE_URL` 一个，另两个由它推导（WS 把 `http` 字符串换成 `ws`；SSE 拼路径前缀）——避免两处维护：切本地开发时只改一处，三条通道一起跟着指到 localhost，否则会出现「登录走本地、SSE 还在连云端」的诡异 Bug。

