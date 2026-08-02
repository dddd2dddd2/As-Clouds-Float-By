"""
new_poem.py — 快捷新建诗词草稿工具
用法: python new_poem.py
"""
import sys
from pathlib import Path

POETRY_ROOT = Path(__file__).resolve().parent / "云浮集_YunFuJi"

TEMPLATE = """---
title: "{title}"
cipai: "{cipai}"
genre: "{genre}"
date: "{date}"
epigraph: ""
translation: ""
notes: ""
---

{title}
写下您的诗词正文...
"""

def create_poem():
    print("=== 《云浮集》快捷新建诗词 ===")
    
    # 查找所有卷目录
    vols = sorted([d for d in POETRY_ROOT.iterdir() if d.is_dir() and d.name[0].isdigit()])
    print("\n请选择卷次：")
    for idx, v in enumerate(vols):
        print(f" [{idx + 1}] {v.name}")
        
    choice = input("\n输入卷编号 (如 1): ").strip()
    if not choice.isdigit() or not (1 <= int(choice) <= len(vols)):
        print("✗ 无效选择")
        return
    
    target_vol = vols[int(choice) - 1]
    
    # 获取当前最大序号
    existing_mds = list(target_vol.glob("*.md"))
    next_seq = len(existing_mds) + 1
    seq_str = f"{next_seq:02d}"
    
    cipai = input("词牌/体裁 (如 临江仙 / 七律): ").strip()
    sub_title = input("副标题/诗题 (如 旧梦): ").strip()
    
    full_title = f"{cipai}·{sub_title}" if sub_title else cipai
    filename = f"{seq_str}_{cipai}_{sub_title}.md" if sub_title else f"{seq_str}_{cipai}.md"
    filepath = target_vol / filename
    
    content = TEMPLATE.format(
        title=full_title,
        cipai=cipai,
        genre="词" if cipai in {"临江仙", "一剪梅", "蝶恋花", "卜算子", "行香子"} else "诗",
        date=""
    )
    
    filepath.write_text(content, encoding="utf-8")
    print(f"\n✓ 成功创建诗词文件: {filepath.relative_to(POETRY_ROOT.parent)}")
    print("👉 现在可以用编辑器打开该文件开始创作了！")

if __name__ == "__main__":
    create_poem()