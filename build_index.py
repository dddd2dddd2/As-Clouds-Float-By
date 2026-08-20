#!/usr/bin/env python3
"""
build_index.py — 《云浮集》索引构建器
自动扫描 云浮集_YunFuJi 目录下所有 .md 诗词文件，生成 index.json。
新增 .md 文件后运行此脚本即可更新索引。

用法: python build_index.py

⚠ index.json 须提交到 Git，不可加入 .gitignore。
"""

import json
import re
from pathlib import Path

# ====================== 配置 ======================
POETRY_DIR = "云浮集_YunFuJi"
OUTPUT_FILE = "index.json"

# 跳过的子目录（非诗词内容）
SKIP_DIRS = {"99_其他"}

# 前言目录（单独处理，不计入诗词）
PREFACE_DIR = "00_总纲与序言"

# ====================== 体裁识别 ======================

# 已知词牌名 → 归类为"词"
KNOWN_CIPAI = {
    "临江仙", "蝶恋花", "一剪梅", "行香子", "卜算子",
    "浣溪沙", "鹧鸪天", "满江红", "念奴娇", "水调歌头",
    "菩萨蛮", "虞美人", "清平乐", "西江月", "如梦令",
    "醉花阴", "声声慢", "雨霖铃", "踏莎行", "渔家傲",
    "苏幕遮", "定风波", "破阵子", "江城子", "青玉案",
    "点绛唇", "忆江南", "渔歌子", "长相思", "采桑子",
    "南歌子", "相见欢", "望江南", "诉衷情", "生查子",
    "木兰花", "减字木兰花", "摸鱼儿", "贺新郎", "沁园春",
    "钗头凤", "凤凰台上忆吹箫", "永遇乐", "齐天乐",
}

# 卷目录名正则：01_卷一_帘栊幽梦
VOL_RE = re.compile(r"^(\d+)_卷([一二三四五六七八九十百千]+)_(.+)$")

# 中文数字 → 阿拉伯数字
CN_NUM = {"〇": "0", "零": "0", "0": "0", "一": "1", "二": "2", "三": "3", "四": "4",
          "五": "5", "六": "6", "七": "7", "八": "8", "九": "9"}


def cn_to_int(s: str) -> int | None:
    """将中文数字（如“二十六”“三”“十二”）转为整数，支持 0~99。"""
    if not s:
        return None
    if all(ch in CN_NUM for ch in s):
        return int("".join(CN_NUM[ch] for ch in s))
    if "十" in s:
        a, _, b = s.partition("十")
        tens = int(CN_NUM[a]) if a and a in CN_NUM else 1
        ones = int(CN_NUM[b]) if b and b in CN_NUM else 0
        return tens * 10 + ones
    return None


def extract_lunar_date(date_str: str) -> str:
    """从 date 字段中提取农历日期，如 '2026-08-09（丙午年六月廿七）' → '丙午年六月廿七'"""
    if not date_str:
        return ""
    m = re.search(r"([〇0一二三四五六七八九甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥]{2}年[一二三四五六七八九十]+月[初一二三四五六七八九十廿卅]+)", date_str)
    if m:
        return m.group(1)
    m = re.search(r"([一二三四五六七八九十]{2}年[一二三四五六七八九十]+月[初一二三四五六七八九十廿卅]+)", date_str)
    return m.group(1) if m else ""


def extract_sort_date(meta: dict, notes: str = "") -> str:
    """提取用于排序的标准日期，格式 YYYY-MM-DD；无法识别则返回空字符串。"""
    raw = (meta.get("date") or "").strip() or (meta.get("dateLocation") or "").strip()

    # 1. YAML date 中的西历 2026-08-08 / 2026-8-8
    m = re.search(r"(\d{4})[-/年.](\d{1,2})[-/月.](\d{1,2})", raw)
    if m:
        y, mo, d = (int(m.group(1)), int(m.group(2)), int(m.group(3)))
        if 1 <= mo <= 12 and 1 <= d <= 31:
            return f"{y:04d}-{mo:02d}-{d:02d}"

    # 2. YAML date / notes 中的“二〇二六年八月八日”式中文纪日
    haystack = raw or ""
    if notes:
        haystack = (haystack + "\n" + notes) if haystack else notes
    m = re.search(r"([〇0一二三四五六七八九零]{4})年([一二三四五六七八九十]{1,2})月([一二三四五六七八九十]{1,3})日", haystack)
    if m:
        y = "".join(CN_NUM.get(ch, ch) for ch in m.group(1))
        mo = cn_to_int(m.group(2))
        d = cn_to_int(m.group(3))
        if y.isdigit() and mo and d and 1 <= mo <= 12 and 1 <= d <= 31:
            return f"{int(y):04d}-{mo:02d}-{d:02d}"

    # 3. notes 中的西历“2026年8月8日”式阿拉伯纪日
    if notes:
        m = re.search(r"(\d{4})年(\d{1,2})月(\d{1,2})日", notes)
        if m:
            y, mo, d = (int(m.group(1)), int(m.group(2)), int(m.group(3)))
            if 1 <= mo <= 12 and 1 <= d <= 31:
                return f"{y:04d}-{mo:02d}-{d:02d}"

    return ""


# ====================== 解析函数 ======================

def parse_volume(dirname: str) -> dict | None:
    """解析卷目录名 → {id, name, fullName}"""
    m = VOL_RE.match(dirname)
    if not m:
        return None
    return {
        "id": int(m.group(1)),
        "name": m.group(3),
        "fullName": f"卷{m.group(2)}·{m.group(3)}",
    }


def parse_filename(filename: str) -> tuple[str, str, str]:
    """
    从文件名提取序号、体裁提示、副标题。
    '01_临江仙_旧梦.md' → ('01', '临江仙', '旧梦')
    '03_七律_寒村秋暮.md' → ('03', '七律', '寒村秋暮')
    """
    stem = Path(filename).stem
    parts = stem.split("_", 2)
    if len(parts) >= 3:
        return parts[0], parts[1], parts[2]
    elif len(parts) == 2:
        return parts[0], parts[1], ""
    return parts[0], "", ""


def detect_genre(cipai_hint: str, raw_genre: str = "") -> tuple[str, str]:
    """根据词牌与体裁提示，精准判断 (cipai, genre_category)

    归一化为三大体裁大类：词 / 近体诗 / 古体乐府。
    词牌（KNOWN_CIPAI）强制归为“词”；律绝归为“近体诗”；古风乐府归为“古体乐府”。
    """
    # 1. 优先校验是否为已知词牌，若是词牌，强制归为“词”
    for known in KNOWN_CIPAI:
        if known == cipai_hint or cipai_hint.startswith(known):
            return known, "词"

    # 2. 判断律绝近体诗
    if any(k in cipai_hint or k in raw_genre for k in ["七律", "五律", "七绝", "五绝"]):
        return cipai_hint, "近体诗"

    # 3. 判断古风乐府
    if any(k in cipai_hint or k in raw_genre for k in ["五古", "七古", "乐府", "歌行", "古风"]):
        return cipai_hint, "古体乐府"

    return cipai_hint, raw_genre or "诗"


def parse_md(filepath: Path) -> tuple[str | None, str | None]:
    """读取 .md 文件，返回 (标题, 正文内容)"""
    text = filepath.read_text(encoding="utf-8").strip()
    if not text:
        return None, None

    lines = text.split("\n")
    title = None
    content_start = 0

    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith("#"):
            title = stripped.lstrip("#").strip()
            content_start = i + 1
            break

    if title is None:
        return None, None

    content = "\n".join(lines[content_start:]).strip()
    return title, content


def parse_md_with_yaml(filepath: Path) -> tuple[dict, str]:
    """增强版 MD 解析器：支持解析 YAML Front Matter 标头与 Markdown 正文"""
    text = filepath.read_text(encoding="utf-8").strip()
    if not text:
        return {}, ""

    meta = {}
    content = text

    # 支持 --- 包裹的 YAML 元数据
    if text.startswith("---"):
        parts = text.split("---", 2)
        if len(parts) >= 3:
            yaml_block = parts[1].strip()
            content = parts[2].strip()

            # 简易多行 YAML 键值提取
            curr_key = None
            for line in yaml_block.split("\n"):
                line_str = line.strip()
                if not line_str or line_str.startswith("#"):
                    continue
                if ":" in line_str and not line_str.startswith("-"):
                    k, v = line_str.split(":", 1)
                    curr_key = k.strip()
                    val_str = v.strip().strip('"\'')
                    if val_str in ("|", ">"):
                        meta[curr_key] = ""
                    else:
                        meta[curr_key] = val_str
                elif curr_key and (line.startswith("  ") or line.startswith("\t")):
                    if meta[curr_key]:
                        meta[curr_key] += "\n" + line_str
                    else:
                        meta[curr_key] = line_str

    # 若未在 YAML 中指定 title，则提取第一个 # 标题
    if "title" not in meta or not meta["title"]:
        lines = content.split("\n")
        for i, line in enumerate(lines):
            stripped = line.strip()
            if stripped.startswith("#"):
                meta["title"] = stripped.lstrip("#").strip()
                content = "\n".join(lines[i + 1:]).strip()
                break

    return meta, content


def parse_preface(preface_dir: Path) -> dict:
    """解析前言目录，提取简介与自序"""
    info = {"introduction": "", "preface": "", "motto": ""}
    if not preface_dir.exists():
        return info

    for md in sorted(preface_dir.glob("*.md")):
        title, content = parse_md(md)
        if not title:
            continue
        full = f"{title}\n{content}" if content else title

        if "简介" in md.name or "简介" in title:
            info["introduction"] = full
            # 尝试提取核心诗意
            for line in (content or "").split("\n"):
                if "核心诗意" in line:
                    m = re.search(r'["“](.*?)["”]', line)
                    if m:
                        info["motto"] = m.group(1)
        elif "自序" in md.name or "前言" in md.name:
            info["preface"] = full

    if not info["motto"]:
        info["motto"] = "莫问春迟，且看云浮；浮云也有归时节。"

    return info


# ====================== 主逻辑 ======================

def build_index():
    root = Path(__file__).resolve().parent
    poetry_root = root / POETRY_DIR

    if not poetry_root.exists():
        print(f"✗ 目录不存在: {poetry_root}")
        return

    print("=" * 54)
    print("    《云浮集》索引构建器  build_index.py")
    print("=" * 54)
    print(f"\n  扫描目录: {poetry_root}\n")

    # 解析前言
    preface = parse_preface(poetry_root / PREFACE_DIR)

    volumes: dict[int, dict] = {}
    poems: list[dict] = []
    genres_found: set[str] = set()
    cipai_found: set[str] = set()

    # 遍历卷目录
    for vol_dir in sorted(poetry_root.iterdir()):
        if not vol_dir.is_dir():
            continue
        if vol_dir.name in SKIP_DIRS or vol_dir.name == PREFACE_DIR:
            continue
            
        IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".gif", ".webp"}

        vol = parse_volume(vol_dir.name)
        if not vol:
            # 非标准目录：直接跳过，不再生成 Volume 14 / 07_其他
            print(f"  ⚠ 跳过非标准目录: {vol_dir.name}")
            continue

        volumes[vol["id"]] = vol
        print(f"\n  ── {vol['fullName']} ──")

        for md in sorted(vol_dir.glob("*.md")):
            meta, content = parse_md_with_yaml(md)
            if not content:
                print(f"    ✗ 跳过空文件: {md.name}")
                continue

            seq, cipai_hint, _ = parse_filename(md.name)
            cipai, genre = detect_genre(meta.get("cipai") or cipai_hint, meta.get("genre") or "")
            title = meta.get("title", md.stem)

            # Scan for static images
            static_images = []
            for img in sorted(vol_dir.glob(f"{md.stem}*.*")):
                if img.suffix.lower() in IMAGE_EXTS and img.name != md.name:
                    static_images.append(f"{vol_dir.name}/{img.name}")

            poem_id = f"v{vol['id']}-{seq}"
            notes = meta.get("notes", "")
            date_str = meta.get("dateLocation") or meta.get("date", "")
            poems.append(
                {
                    "id": poem_id,
                    "title": title,
                    "cipai": cipai,
                    "genre": genre,
                    "volume": vol["id"],
                    "source": f"{vol_dir.name}/{md.name}",
                    "content": content,
                    "epigraph": meta.get("epigraph", ""),
                    "dateLocation": date_str,
                    "lunarDate": extract_lunar_date(date_str),
                    "dateSort": extract_sort_date(meta, notes),
                    "translation": meta.get("translation", ""),
                    "notes": notes,
                    "staticImages": static_images,
                }
            )

            genres_found.add(genre)
            cipai_found.add(cipai)
            print(f"    ✓ [{genre:　<4}] {title}")

    # 构建索引对象
    dated = [p["dateSort"] for p in poems if p["dateSort"]]
    last_updated = max(dated) if dated else ""
    index = {
        "meta": {
            "title": "云浮集",
            "englishTitle": "As Clouds Float By",
            "motto": preface["motto"],
            "introduction": preface["introduction"],
            "preface": preface["preface"],
            "totalPoems": len(poems),
            "lastUpdated": last_updated,
        },
        "volumes": [volumes[k] for k in sorted(volumes)],
        "genres": sorted(genres_found),
        "cipaiList": sorted(cipai_found),
        "poems": poems,
    }

    # 写入 index.json
    out = root / OUTPUT_FILE
    out.write_text(json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"\n{'=' * 54}")
    print(f"  ✓ 完成！共收录 {len(poems)} 首诗词")
    print(f"    卷数: {len(volumes)}")
    print(f"    体裁: {', '.join(sorted(genres_found))}")
    print(f"    词牌: {', '.join(sorted(cipai_found))}")
    print(f"    输出: {out}")
    print(f"\n  ⚠ 请将 {OUTPUT_FILE} 提交到 Git（勿加入 .gitignore）")
    print(f"{'=' * 54}")


if __name__ == "__main__":
    build_index()
