---
title: css复习
published: 2026-08-11
description: 其实是面试当天临时总结的，算不上啥文章（虽然很像草稿.......）
tags:
  - 前端
  - css
category: 分类
slug: css-study
images: images/
---
# 尺寸操作

最基本的有width、height、padding

如果width:100%，是包括padding的，此时要调整为box-sizing:border-box

margin:0,auto(上下0.左右自适应)

\*{
margin:0
padding:0
}

# 背景处理

background-colar

background-iamge:utk()

box-shadow(右，下，范围)

# 文本处理

text-indent:2em （缩进

font-size
font-family

# 位置操作

## 定位
position:absolute
默认参考是最外面的body，如果想以父（级）做参考，可以在想要被参考的父元素设定:position:relative

position:fixed 基于可视区域不动

# 网页布局
## flex


某个大盒子 {
display:flex
align-items:center(垂直居中)、flex-start/end(上(默认)，下)
justify-content:center,flex-start/end(左（默认）、右)
}

小盒子1：flex:1
小盒子2:flex:2
小盒子3:flex:3

呈现比例如上

.flex-items：nth（2n+1):width:200px（最大），1、3固定，2自适应，可以把2设置一个min-width

## grid
大盒子{
display:grid
grid-template-colums:20% 50% 30%  /1fr 1fr 2fr/repeat(3,1fr)/300px auto 200px设置列比例就行，哪怕有600个元素，他也会自动给你以这个规则天朝200行的

grid-template-rows:1fr 2fr

}

隐藏：overflow:hidden