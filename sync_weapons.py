from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parent
WEAPONS_PATH = ROOT / "weapons.json"
HTML_PATH = ROOT / "index.html"


def main() -> None:
    weapons = json.loads(WEAPONS_PATH.read_text(encoding="utf-8"))
    if not isinstance(weapons, list) or not weapons:
        raise ValueError("weapons.json 顶层必须是非空数组")

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
