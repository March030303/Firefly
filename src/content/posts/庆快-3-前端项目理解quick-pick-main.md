---
title: "庆快-3-前端项目理解（quick-pick-main）"
published: 2026-09-24
description: 文章简短描述
tags: [标签]
category: 分类
images: images/
draft: false
---
# server层
## 理解

![233](https://cdn.jsdelivr.net/gh/March030303/Picgo@main/img/20260922172537514.png)
现在庆快前端项目过渡到server层，理解上：

1、generated文件夹：由后端决定的一个个js文件（以业务为界），可以import里面的方法。
是==自动生成==的（npm run api:gen），禁止手工修改——重新生成会整体替换目录，手改的内容会丢
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

## 使用




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