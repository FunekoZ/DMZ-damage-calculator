# 枪械数据维护

## 唯一手写数据源

编辑根目录 [weapons.json](../weapons.json)。完成后运行：

```bash
python sync_weapons.py
```

脚本会：

1. 校验所有枪械配置；
2. 生成紧凑的离线回退数据；
3. 更新 [assets/js/weapons-data.js](../assets/js/weapons-data.js)。

不要手工修改生成文件，否则下次同步会覆盖修改。

## 字段

- `name`：显示名称。
- `shot_interval_ms`：射击间隔，必须为正数。
- `projectiles_per_shot`：每次开火弹丸数，默认为 `1`。
- `built_in_flesh_ratio`：自带肉伤比例，范围 `0–1`，默认为 `0`。
- `unarmored_damage_multiplier`：直接命中无甲部位的倍率，默认为 `1`。
- `damage_ranges`：非空射程数组，每项包含正向区间 `min < max` 和正伤害 `damage`。
- `region_multipliers`：必须包含 `head`、`upper_chest`、`abdomen`、`upper_arm`、`lower_arm`、`legs` 六个正倍率。

## 修改后的检查

```bash
python sync_weapons.py
python -m json.tool weapons.json > /dev/null
```

然后刷新页面，至少检查：

- 枪械选择器名称与分组；
- 射程下拉框数量与文本；
- 目标品质限制；
- 普通枪数、TTK、排行和曲线均可计算。

当前部分品质上限和推荐预设仍由 [controls.js](../assets/js/ui/controls.js) / [ranking.js](../assets/js/features/ranking.js) 根据名称处理。若重命名 J358、USS9、Type19 等特殊枪械，应同时搜索旧名称引用。
