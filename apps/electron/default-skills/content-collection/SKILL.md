---
name: content-collection
description: 从社交平台采集热门内容、爆款文案、竞品分析
version: "2.0.0"
---

# 内容采集技能

## 功能概述
使用 `collect_trends` 工具从社交平台采集热门内容。支持：
- 小红书爆款笔记采集
- 抖音热门视频采集
- 微博热门内容采集
- B站热门视频采集

## 可用工具

### collect_trends
从社交平台采集热门内容。

**参数：**
```json
{
  "source": "xiaohongshu | douyin | weibo | bilibili",
  "keywords": ["女装", "爆款"],
  "count": 10,
  "content_type": "video | image | text"
}
```

**示例调用：**
```
工具: collect_trends
参数: {
  "source": "xiaohongshu",
  "keywords": ["女装", "连衣裙", "夏季"],
  "count": 20
}
```

### get_collection_results
获取采集的完整结果。

**参数：**
```json
{
  "collection_id": "采集任务ID"
}
```

## 典型场景

### 场景1：采集小红书爆款文案
用户说："帮我采集小红书上女装的爆款文案"

你应该：
1. 调用 `collect_trends` 工具
2. source: "xiaohongshu"
3. keywords: ["女装", "连衣裙"]
4. count: 10-20

### 场景2：采集竞品分析内容
用户说："采集抖音上竞品账号的爆款视频标题"

你应该：
1. 调用 `collect_trends` 工具
2. source: "douyin"
3. keywords: ["竞品账号名"]
4. count: 20
5. content_type: "video"

### 场景3：采集多个关键词
用户说："采集小红书上关于'显瘦'、'百搭'、'通勤'的爆款内容"

你应该：
1. 调用 `collect_trends` 工具
2. keywords: ["显瘦", "百搭", "通勤"]

## 支持的平台

| 平台 | source 值 | 说明 |
|------|-----------|------|
| 小红书 | xiaohongshu | 笔记、图片、视频 |
| 抖音 | douyin | 短视频 |
| 微博 | weibo | 热搜、热门微博 |
| B站 | bilibili | 视频 |

## 返回数据格式

采集完成后返回：
```json
{
  "collection_id": "采集任务ID",
  "collected": 20,
  "results": [
    {
      "title": "爆款标题",
      "content": "内容正文",
      "likes": 10000,
      "author": "作者名"
    }
  ]
}
```

## 注意事项

- count 表示每个关键词采集的数量
- content_type 可选，不填则采集所有类型
- 采集结果可配合 `list_product` 用于商品上架参考
