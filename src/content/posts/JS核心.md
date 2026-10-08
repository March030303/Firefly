---
title: ES6核心
published: 2026-08-11
description: 文章简短描述
tags:
  - 前端
  - javascript
category: 分类
slug: es6-study
images: images/
---
# 开发中遇到的一些例子

1、第二行&&表示短路， const payload = response && response.data表示只有左边为真，才会执行右边，也就是把data赋值

throw new Error((payload && (payload.message || payload.msg)) || '请求失败')这一行也能类似的理解
```
export const unwrapData = (response, fallback = null) => {

  const payload = response && response.data;       

  if (!payload || payload.code !== 1) {

    throw new Error((payload && (payload.message || payload.msg)) || '请求失败');

  }

  return payload.data === null || payload.data === undefined ? fallback : payload.data;

}
```