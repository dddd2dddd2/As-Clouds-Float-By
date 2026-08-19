# 云浮集 · As Clouds Float By
https://dddd2dddd2.github.io/As-Clouds-Float-By/

> 莫问春迟，且看云浮；浮云也有归时节。
> *Ask not why spring tarries — just watch the clouds drift by; even the drifting clouds have a season to return.*

《云浮集》是一部原创古典诗词集，收录以传统诗词形式（词、乐府、五言古诗、七言律诗）写就的作品，共六卷：

*As Clouds Float By* is a collection of original classical Chinese poetry, written in traditional forms (ci 词, yuefu 乐府, five-character old poetry 五古, and regulated verse 七律), arranged in six volumes:

- **卷一 · 帘栊幽梦**：临江仙、蝶恋花、一剪梅、行香子等词牌
  *Volume I · Dreams Behind the Curtain*: poems in the cipai patterns Linjiangxian, Dielianhua, Yijianmei, and Xingxiangzi
- **卷二 · 剑胆狂澜**：一剪梅·古铁、孤灯、观潮、冬晓
  *Volume II · Swordsman's Spirit*: Yijianmei pieces on ancient iron, a lone lamp, the tides, and a winter dawn
- **卷三 · 汉魏高古**：五言古诗与乐府
  *Volume III · High Antiquity of Han-Wei*: five-character old poetry and yuefu
- **卷四 · 人间清欢**：卜算子、浣溪沙等闺房幽默、饮酒品茶之作
  *Volume IV · The Leisurely Hearth*: Busuanzi and Huanxisha pieces on homely humor, wine and tea
- **卷五 · 山水行吟**：七律、七绝、点绛唇等纪行写景、异域见闻之作
  *Volume V · Travels Far*: regulated verse and travel pieces on journeys, traffic, and everyday scenery
- **卷六 · 青史惊澜**：贺新郎怀古咏史、历史人物独白之作
  *Volume VI · Tumult in the Annals*: Hexinlang pieces on history and dramatic monologues of historical figures

本项目附带一个简单的静态网页（`index.html`、`style.css`、`js/`），用于在线浏览与展示全部诗词。

*The project also includes a lightweight static website (`index.html`, `style.css`, `js/`) for browsing and displaying all the poems online.*

## 目录结构 / Project Structure

```
├── index.html            # 展示页面 / display page
├── style.css             # 样式 / styles
├── js/                   # 交互逻辑（ES Modules）/ interactivity
│   ├── script.js         # 入口 / entry point
│   ├── state.js          # 全局状态 / shared state
│   ├── database.js       # IndexedDB 配图存储 / image storage
│   ├── language.js       # 简繁转换 / language conversion
│   ├── layout.js         # 布局切换 / layout toggle
│   ├── animation.js      # 排版动画 / typography animation
│   ├── gallery.js        # 配图与 Lightbox / gallery
│   ├── search.js         # 筛选与搜索 / filter & search
│   └── reader.js         # 阅读器 / reader modal
├── index.json            # 诗词数据 / poem data
├── build_index.py        # 构建 index.json / builds index.json
├── create_bundle.py      # 打包工具 / bundling utility
└── 云浮集_YunFuJi/       # 诗集源文件（Markdown）/ source files (Markdown)
```

## 许可 / License

本项目采用完全私有许可，**仅供文章展示浏览之用**。未经作者书面授权，禁止任何形式的复制、转载、修改、发行、商用或训练用途。详见 [LICENSE](LICENSE)。

*This project is under a fully private license, **for display and viewing purposes only**. Any copying, redistribution, modification, publication, commercial use, or use in training is prohibited without the author's prior written consent. See [LICENSE](LICENSE).*

## 作者 / Author

[dddd2dddd2](https://github.com/dddd2dddd2) · [hippohippo-ai](https://github.com/hippohippo-ai)
