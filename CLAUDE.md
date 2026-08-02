# Claude 维护导航

开始修改前先读 [docs/INDEX.md](docs/INDEX.md)，只打开任务对应的少量文件。

## 关键约束

- 保持 [index.html](index.html) 可通过 `file://` 直接双击运行。
- 不要恢复单体 `assets/js/app.js` 或把多个职责重新合并到一个超大文件。
- 手写 JavaScript/CSS 文件达到约 300 行时优先继续拆分。
- [assets/js/weapons-data.js](assets/js/weapons-data.js) 是生成文件；枪械数据只改 [weapons.json](weapons.json)，然后运行 `python sync_weapons.py`。
- 经典脚本共享顶层作用域，新增文件必须同步维护 [index.html](index.html) 的依赖顺序。
- 领域计算不要读取 DOM；推荐规则统一使用 `recommendationPlan()`。
- 修改伤害、随机排列、推荐或概率说明后，按 [CALCULATOR_MAINTENANCE.md](CALCULATOR_MAINTENANCE.md) 的历史回归清单验证。
