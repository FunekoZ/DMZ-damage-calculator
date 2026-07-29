from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parent
WEAPONS_PATH = ROOT / "weapons.json"
HTML_PATH = ROOT / "index.html"
REGIONS = {"head", "upper_chest", "abdomen", "upper_arm", "lower_arm", "legs"}


def positive_number(value: object) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and value > 0


def validate_weapons(weapons: object) -> list[dict]:
    if not isinstance(weapons, list) or not weapons:
        raise ValueError("weapons.json 顶层必须是非空数组")

    for index, weapon in enumerate(weapons, start=1):
        prefix = f"第 {index} 个枪械配置"
        if not isinstance(weapon, dict):
            raise ValueError(f"{prefix}必须是对象")
        if not isinstance(weapon.get("name"), str) or not weapon["name"].strip():
            raise ValueError(f"{prefix}缺少有效名称")
        if not positive_number(weapon.get("shot_interval_ms")):
            raise ValueError(f"{prefix}的射击间隔必须是正数")
        projectiles = weapon.get("projectiles_per_shot", 1)
        if not isinstance(projectiles, int) or isinstance(projectiles, bool) or projectiles < 1:
            raise ValueError(f"{prefix}的每次开火弹丸数必须是大于等于 1 的整数")

        multipliers = weapon.get("region_multipliers")
        if not isinstance(multipliers, dict) or any(not positive_number(multipliers.get(region)) for region in REGIONS):
            raise ValueError(f"{prefix}缺少有效的部位倍率")

        ranges = weapon.get("damage_ranges")
        if not isinstance(ranges, list) or not ranges:
            raise ValueError(f"{prefix}缺少射程伤害配置")
        for range_index, damage_range in enumerate(ranges, start=1):
            if not isinstance(damage_range, dict):
                raise ValueError(f"{prefix}的第 {range_index} 个射程配置必须是对象")
            minimum = damage_range.get("min")
            maximum = damage_range.get("max")
            damage = damage_range.get("damage")
            if (
                not isinstance(minimum, (int, float))
                or isinstance(minimum, bool)
                or minimum < 0
                or not positive_number(maximum)
                or maximum <= minimum
                or not positive_number(damage)
            ):
                raise ValueError(f"{prefix}的第 {range_index} 个射程伤害配置无效")

    return weapons


def main() -> None:
    weapons = validate_weapons(json.loads(WEAPONS_PATH.read_text(encoding="utf-8")))

    serialized = json.dumps(weapons, ensure_ascii=False, indent=2)
    html = HTML_PATH.read_text(encoding="utf-8")
    html, count = re.subn(
        r"const BUILT_IN_WEAPONS = \[.*?\n\];",
        f"const BUILT_IN_WEAPONS = {serialized};",
        html,
        count=1,
        flags=re.DOTALL,
    )
    if count != 1:
        raise ValueError("无法定位 index.html 中的 BUILT_IN_WEAPONS")

    HTML_PATH.write_text(html, encoding="utf-8")
    print("已同步：weapons.json -> index.html")


if __name__ == "__main__":
    main()
