# 项目架构

## 运行约束

项目没有依赖、构建器或开发服务器。用户可直接双击 [index.html](../index.html)，因此运行时不能依赖 `fetch()` 成功、原生 ES modules 或服务端能力。

通过 HTTP 打开时，[weapon-repository.js](../assets/js/data/weapon-repository.js) 会尝试读取 [weapons.json](../weapons.json)；通过 `file://` 打开时，直接使用预先生成的 [weapons-data.js](../assets/js/weapons-data.js)。

## JavaScript 层次

```text
weapons-data.js
  ↓
domain/config.js
  ↓
ui/random-inputs.js
  ↓
domain/calculator.js
  ↓
data/weapon-repository.js
  ↓
app/state.js
  ↓
domain/recommendations.js
  ↓
features/range-curve.js
  ↓
ui/controls.js
  ↓
ui/layout.js
  ↓
features/ranking.js
  ↓
ui/results-table.js
  ↓
features/export.js
  ↓
app/render.js
  ↓
app/events.js
```

所有脚本都是经典脚本，并共享顶层词法作用域。这样保留 `file://` 兼容性，但要求：

1. 禁止在不同文件重复声明同名顶层 `const`、`let`、函数或类。
2. 依赖必须先于使用者加载。
3. 领域计算不应新增 DOM 读取；DOM 和事件应留在 `ui/`、`features/` 或 `app/`。
4. 推荐筛选必须继续统一调用 `recommendationPlan()`。

## 模块职责

- `domain/config.js`：品质、护甲、命中、词条定义与词条列。
- `domain/calculator.js`：伤害结算、排列枚举、随机采样和期望结果。
- `domain/recommendations.js`：推荐计划、概率说明和词条展示格式。
- `data/weapon-repository.js`：枪械 schema 校验、读取与运行时数据切换。
- `app/state.js`：跨功能共享的运行时状态和曲线视觉常量。
- `features/range-curve.js`：射程曲线数据与 SVG 渲染。
- `features/ranking.js`：全枪械 TTK 排行数据和排行表。
- `features/export.js`：Excel XML 生成与各模式数据导出。
- `ui/random-inputs.js`：随机命中控件初始化。
- `ui/controls.js`：枪械选择器、品质限制、预设和自动重算。
- `ui/layout.js`：桌面结果区域与表格尺寸同步。
- `ui/results-table.js`：普通、总表、对比和曲线视图分派。
- `app/render.js`：读取当前表单，执行对应计算流程，更新摘要。
- `app/events.js`：模式按钮、弹窗、视图和初始化事件。

## CSS 层次

- `foundation.css`：设计变量、全局基础、页头、公告和对话框。
- `controls.css`：页面布局、控制面板、输入、按钮和摘要。
- `results.css`：结果表、推荐提示、排行和曲线。
- `responsive.css`：所有响应式覆盖。

页面显式使用多个 `<link>`，便于识别加载顺序并避免把所有样式重新合并成大文件。

## 数据流

```text
表单输入
  → render()
  → validateWeapon()/当前射程配置
  → expected()
  → recommendationPlan()
  → drawTable()/drawCurveChart()/drawRankingTable()
```

排行、曲线、普通结果和对比结果都应复用同一伤害与推荐实现，不能在渲染层复制算法。
