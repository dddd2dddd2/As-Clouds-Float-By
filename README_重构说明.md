# script.js 拆分说明

把原来 ~800 行的单文件 `script.js` 按职责拆成了 9 个 ES Module 文件（用 `import`/`export`，不需要构建工具，浏览器原生支持）。所有 JS 都放在 `js/` 子目录，不污染项目主目录：

```
js/state.js         全局共享 state / els（各模块共享同一份引用）
js/database.js      IndexedDB 本地配图存储
js/language.js      简繁转换 + 静态文案
js/layout.js        横排 / 竖排布局切换
js/animation.js     电影感排版动画、计时器、水墨飞溅
js/gallery.js       诗词配图 + Lightbox
js/search.js        卷次筛选、搜索、列表渲染
js/reader.js        阅读器 Modal 打开/关闭、详情渲染
js/script.js        入口：init() 与事件绑定，编排以上模块
```

## 设计取舍

为了把改动风险降到最低，这次拆分做的是**按职责拆文件**，而不是"每个模块完全自治、互不知道彼此状态"的深度重构：
- 原来单个 `state` 和 `els` 对象整体挪到了 `state.js`，其余模块 `import { state, els } from './state.js'` 共享同一份引用，读写方式和原来完全一样（`state.xxx` / `els.xxx`）。
- 每个函数体内部的代码**逐字未改**，只是移动了位置、加上了 `export`，以及在文件顶部加了必要的 `import`。这样出错概率最低，行为应该和原来完全一致。
- 后续如果想让某个模块（比如 `layout.js` 的 `isVertical`、`language.js` 的 `isTraditional`）真正拥有自己的私有状态、不再依赖共享 `state` 对象，可以再单独深化，但这是下一步，不是这次改动的范围。

## 需要同步改的地方

`index.html` 里原来的引入方式：
```html
<script type="module" src="js/script.js"></script>
```
（因为用了 `import`/`export`，浏览器要求声明为模块。）
上面这一行 OpenCC 的 `<script>` 保持不变即可（它是全局脚本，`language.js` 里通过 `window.OpenCC` 读取，执行顺序不受影响）。

**部署时注意**：ES Module 必须通过 `http://` 或 `https://` 访问（本地用 `run.bat` 起的服务器没问题），不能直接双击用 `file://` 打开 `index.html`，这点其实和原来用 `fetch('./index.json')` 的要求是一样的，不会有额外限制。

## 文件依赖关系

```
js/script.js (入口)
 ├─ js/state.js
 ├─ js/language.js ─┐
 ├─ js/layout.js     │
 ├─ js/animation.js  ├→ js/state.js
 ├─ js/database.js   │
 ├─ js/gallery.js ──── js/database.js
 ├─ js/search.js  ──── js/language.js, js/reader.js
 └─ js/reader.js  ──── js/language.js, js/animation.js, js/gallery.js, js/layout.js
```
没有循环依赖。
