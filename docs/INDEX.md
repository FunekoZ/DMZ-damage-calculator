# 项目定向阅读索引

本项目保持无构建步骤、可直接双击 [index.html](../index.html) 运行。JavaScript 使用按顺序加载的经典脚本；各文件共享同一个顶层词法作用域，因此脚本顺序就是依赖顺序。

## 修改任务 → 首选文件

| 修改任务 | 首先读取 | 必要时再读取 |
|---|---|---|
| 修改枪械伤害、射程或倍率 | 对应 [weapons.json](../weapons.json) 条目 | [sync_weapons.py](../sync_weapons.py)、[WEAPON_DATA.md](WEAPON_DATA.md) |
| 修改词条定义或品质降级 | [config.js](../assets/js/domain/config.js) | [calculator.js](../assets/js/domain/calculator.js) |
| 修改护甲、伤害、随机排列 | [calculator.js](../assets/js/domain/calculator.js) | [CALCULATOR_MAINTENANCE.md](../CALCULATOR_MAINTENANCE.md) |
| 修改推荐概率或最优词条规则 | [recommendations.js](../assets/js/domain/recommendations.js) | [CALCULATOR_MAINTENANCE.md](../CALCULATOR_MAINTENANCE.md) |
| 修改枪械读取、校验、选择器数据 | [weapon-repository.js](../assets/js/data/weapon-repository.js) | [controls.js](../assets/js/ui/controls.js) |
| 修改射程曲线 | [range-curve.js](../assets/js/features/range-curve.js) | [results.css](../assets/css/results.css) |
| 修改枪械排行 | [ranking.js](../assets/js/features/ranking.js) | [render.js](../assets/js/app/render.js) |
| 修改结果表格和词条展示 | [results-table.js](../assets/js/ui/results-table.js) | [recommendations.js](../assets/js/domain/recommendations.js)、[results.css](../assets/css/results.css) |
| 修改 Excel 导出 | [export.js](../assets/js/features/export.js) | 对应结果模块 |
| 修改计算流程或摘要状态 | [render.js](../assets/js/app/render.js) | [state.js](../assets/js/app/state.js) |
| 修改按钮、弹窗、模式切换事件 | [events.js](../assets/js/app/events.js) | [controls.js](../assets/js/ui/controls.js) |
| 修改控制区外观 | [controls.css](../assets/css/controls.css) | [responsive.css](../assets/css/responsive.css) |
| 修改表格、曲线或排行外观 | [results.css](../assets/css/results.css) | [responsive.css](../assets/css/responsive.css) |
| 修改页头、公告、对话框基础外观 | [foundation.css](../assets/css/foundation.css) | [responsive.css](../assets/css/responsive.css) |

## 不应手工修改

- [assets/js/weapons-data.js](../assets/js/weapons-data.js) 是由 [sync_weapons.py](../sync_weapons.py) 生成的离线回退数据。
- [assets/css/app.css](../assets/css/app.css) 只是兼容入口；页面当前直接加载四个职责样式文件。
- 不要重新创建单体 [assets/js/app.js](../assets/js/app.js)。

## 依赖顺序

详见 [ARCHITECTURE.md](ARCHITECTURE.md)。新增脚本时，应将其放在依赖它的脚本之前，并同步更新 [index.html](../index.html) 与架构文档。

## 文件规模约束

- 手写 JavaScript 建议不超过 300 行；超过时按领域、功能、UI 或编排职责继续拆分。
- 手写 CSS 建议不超过 300 行；响应式规则集中放在 [responsive.css](../assets/css/responsive.css)。
- 数据生成文件可以更长，但应在文档中明确标记，避免模型为修改逻辑而读取它。
