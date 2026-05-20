"""
Generate gallery TOML and markdown files from a folder of photos.
Reads EXIF + IPTC metadata for automatic title, description, and photography parameters.

Usage:
  python scripts/generate-gallery.py [photos_dir]

  photos_dir defaults to public/gallery-photos/
  Outputs: content/gallery.toml + content/gallery/*.md (zh version too)
"""

import os
import re
import sys
import shutil
from pathlib import Path
from datetime import datetime
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS

ROOT = Path(__file__).resolve().parent.parent
PUBLIC_GALLERY = ROOT / "public" / "gallery"
PHOTOS_DIR = ROOT / "public" / "gallery-photos"


# ---------------------------------------------------------------------------
# IPTC parsing
# ---------------------------------------------------------------------------

def parse_iptc(photoshop_data: dict) -> dict:
    """Extract IPTC tags from Photoshop image resource data (tag 1028)."""
    iptc_raw = photoshop_data.get(1028, b"") if isinstance(photoshop_data, dict) else b""
    result = {}

    i = 0
    while i < len(iptc_raw):
        if iptc_raw[i] != 0x1C:
            i += 1
            continue
        rec = iptc_raw[i + 1]
        ds = iptc_raw[i + 2]
        size = (iptc_raw[i + 3] << 8) | iptc_raw[i + 4]
        data = iptc_raw[i + 5 : i + 5 + size]
        try:
            decoded = data.decode("utf-8").strip("\x00").strip()
        except Exception:
            decoded = ""
        result[(rec, ds)] = decoded
        i += 5 + size

    return result


# ---------------------------------------------------------------------------
# EXIF helpers
# ---------------------------------------------------------------------------

def decode_bytes(val):
    if isinstance(val, bytes):
        try:
            return val.decode("utf-8").strip("\x00").strip()
        except Exception:
            try:
                return val.decode("gbk").strip("\x00").strip()
            except Exception:
                return val.decode("latin-1").strip("\x00").strip()
    return str(val).strip()


def get_exif(path: Path) -> dict:
    """Extract EXIF metadata from an image."""
    data = {}
    try:
        img = Image.open(path)
        exif = img._getexif() if hasattr(img, "_getexif") else None
        if exif:
            for tag_id, value in exif.items():
                tag = TAGS.get(tag_id, tag_id)
                data[tag] = value
    except Exception:
        pass
    return data


def parse_gps(gps_info) -> str:
    """Decode GPSInfo dict to 'lat, lon' string."""
    if not gps_info or not isinstance(gps_info, dict):
        return ""

    def _to_float(val):
        """Convert GPS coordinate component to float degrees."""
        vals = []
        if isinstance(val, tuple):
            for v in val:
                try:
                    vals.append(float(v))
                except (TypeError, ValueError):
                    vals.append(0.0)
            if len(vals) == 2:
                return vals[0] / vals[1] if vals[1] else 0.0
            if len(vals) >= 3:
                return vals[0] + vals[1] / 60.0 + vals[2] / 3600.0
        return float(val)

    try:
        lat = _to_float(gps_info.get(2, 0))
        lon = _to_float(gps_info.get(4, 0))
        lat_ref = str(gps_info.get(1, b"N"))
        lon_ref = str(gps_info.get(3, b"E"))
        if "S" in lat_ref:
            lat = -lat
        if "W" in lon_ref:
            lon = -lon
        return f"{lat:.5f}, {lon:.5f}"
    except Exception:
        return ""

def format_shutter(exposure_time):
    """Format shutter speed: 0.004 -> '1/250', 1.3 -> '1.3s'."""
    try:
        if hasattr(exposure_time, "__iter__"):
            exposure_time = float(exposure_time[0]) / float(exposure_time[1])
        else:
            exposure_time = float(exposure_time)
        if exposure_time < 1:
            return f"1/{int(round(1 / exposure_time))}s"
        else:
            return f"{exposure_time:.1f}s"
    except Exception:
        return ""


def format_aperture(fnumber):
    """Format f-number: 7.1 -> 'f/7.1'."""
    try:
        if hasattr(fnumber, "__iter__"):
            fnumber = float(fnumber[0]) / float(fnumber[1])
        else:
            fnumber = float(fnumber)
        # Round to 1 decimal, strip trailing .0
        s = f"{fnumber:.1f}"
        if s.endswith(".0"):
            s = s[:-2]
        return f"f/{s}"
    except Exception:
        return ""


def format_focal(focal_val):
    """Format focal length: 50.0 -> '50mm'."""
    try:
        if hasattr(focal_val, "__iter__"):
            fl = float(focal_val[0]) / float(focal_val[1])
        else:
            fl = float(focal_val)
        return f"{int(round(fl))}mm"
    except Exception:
        return ""


def format_iso(value):
    """Format ISO value."""
    try:
        if hasattr(value, "__iter__"):
            return str(int(value[0]))
        return str(int(value))
    except Exception:
        return ""


def parse_date(exif: dict) -> str:
    """Extract and format date from EXIF."""
    raw = str(exif.get("DateTimeOriginal", exif.get("DateTime", "")))
    if not raw:
        return ""
    try:
        dt = datetime.strptime(raw.strip(), "%Y:%m:%d %H:%M:%S")
        return dt.strftime("%Y-%m")
    except ValueError:
        return raw[:7] if len(raw) >= 7 else ""


# ---------------------------------------------------------------------------
# Description pipeline
# ---------------------------------------------------------------------------

def get_description(img_path: Path, exif: dict) -> str:
    """Get photo description from sidecar file > IPTC Caption > EXIF > auto."""
    # Priority 1: .txt sidecar file
    sidecar = img_path.with_suffix(".txt")
    if sidecar.exists():
        return sidecar.read_text(encoding="utf-8").strip()

    # Priority 2: IPTC Caption/Abstract
    try:
        img = Image.open(img_path)
        ps = img.info.get("photoshop", {})
        iptc = parse_iptc(ps)
        caption = iptc.get((2, 120), "")
        if caption:
            return caption
    except Exception:
        pass

    # Priority 3: EXIF ImageDescription (Lightroom Caption field)
    desc = decode_bytes(exif.get("ImageDescription", ""))
    if desc:
        return desc

    # Priority 4: EXIF UserComment
    desc = decode_bytes(exif.get("UserComment", ""))
    if desc:
        return desc

    # Fallback
    return ""


# ---------------------------------------------------------------------------
# Slug
# ---------------------------------------------------------------------------

def slugify(filename_stem: str, existing_slugs: set) -> str:
    """Create a URL-safe slug from the original filename stem."""
    slug = filename_stem.lower().strip()
    slug = re.sub(r"[^a-z0-9\s\-_]", "", slug)
    slug = slug.replace(" ", "-").replace("_", "-")
    slug = re.sub(r"-+", "-", slug).strip("-")
    slug = slug[:60]
    if not slug:
        slug = "photo"
    base = slug
    counter = 1
    while slug in existing_slugs:
        slug = f"{base}-{counter}"
        counter += 1
    return slug


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def generate_gallery(photos_dir: Path = None):
    if photos_dir is None:
        photos_dir = PHOTOS_DIR

    if not photos_dir.exists():
        print(f"Photos directory not found: {photos_dir}")
        print("Create it and add your photos, then re-run this script.")
        return

    images = []
    for ext in ("*.jpg", "*.jpeg", "*.png", "*.webp"):
        images.extend(photos_dir.glob(ext))

    if not images:
        print("No images found in", photos_dir)
        return

    print(f"Found {len(images)} photos.")

    PUBLIC_GALLERY.mkdir(parents=True, exist_ok=True)

    gallery_items = []
    for img_path in sorted(images, key=lambda p: p.name):
        exif = get_exif(img_path)

        # ---- Extract IPTC (Lightroom Title, City, Country) ----
        iptc = {}
        try:
            img = Image.open(img_path)
            ps_raw = img.info.get("photoshop", {})
            iptc = parse_iptc(ps_raw)
        except Exception:
            pass

        # ---- Extract title (IPTC ObjectName > filename) ----
        title = iptc.get((2, 5), "") or img_path.stem.replace("_", " ").replace("-", " ").title()

        # ---- Extract photography parameters ----
        camera = decode_bytes(exif.get("Model", ""))
        make = decode_bytes(exif.get("Make", ""))
        # Only prepend make if model doesn't already contain the brand name
        if camera and make:
            brand = make.split()[0] if make.split() else make
            if brand not in camera:
                camera = f"{make} {camera}".strip()

        lens = decode_bytes(exif.get("LensModel", ""))
        aperture = format_aperture(exif.get("FNumber", ""))
        shutter = format_shutter(exif.get("ExposureTime", ""))
        iso = format_iso(exif.get("ISOSpeedRatings", ""))
        focal_length = format_focal(exif.get("FocalLength", ""))

        # ---- GPS ----
        gps_str = parse_gps(exif.get("GPSInfo", {}))

        # ---- Location from GPS reverse or IPTC ----
        location = ""
        if gps_str:
            location = gps_str
        else:
            iptc_city = iptc.get((2, 90), "")
            iptc_country = iptc.get((2, 101), "")
            if iptc_city and iptc_country:
                location = f"{iptc_city}, {iptc_country}"
            elif iptc_city:
                location = iptc_city

        # ---- Date ----
        date = parse_date(exif)

        # ---- Description ----
        description = get_description(img_path, exif)

        # ---- Slug from filename stem (stable, URL-safe) ----
        used_slugs = {item["slug"] for item in gallery_items}
        slug = slugify(img_path.stem, used_slugs)

        # ---- Copy to public/gallery ----
        dest_path = PUBLIC_GALLERY / f"{slug}.jpg"
        if img_path.suffix.lower() in (".png", ".webp"):
            try:
                img_pil = Image.open(img_path)
                img_pil.convert("RGB").save(dest_path, "JPEG", quality=85)
            except Exception:
                shutil.copy2(img_path, dest_path)
        else:
            shutil.copy2(img_path, dest_path)

        image_url = f"/gallery/{slug}.jpg"

        gallery_items.append({
            "title": title,
            "slug": slug,
            "date": date or datetime.now().strftime("%Y-%m"),
            "location": location,
            "camera": camera or "Unknown",
            "lens": lens,
            "aperture": aperture,
            "shutter": shutter,
            "iso": iso,
            "focal_length": focal_length,
            "image": image_url,
            "content": description,
        })

    # Sort by date descending
    gallery_items.sort(key=lambda x: x["date"], reverse=True)

    # ---- Generate TOML ----
    def write_toml(path: Path, items: list, en=True):
        lines = []
        if en:
            lines.append('type = "gallery"')
            lines.append('title = "Gallery"')
            lines.append('description = "Moments captured through my lens — urban exploration, landscapes, and the stories behind each frame."')
        else:
            lines.append('type = "gallery"')
            lines.append('title = "摄影"')
            lines.append('description = "镜头里的世界 — 城市探索、风光与每帧背后的故事。"')
        lines.append("")
        for item in items:
            lines.append("[[items]]")
            for key in ("title", "slug", "date"):
                lines.append(f'{key} = "{item[key]}"')
            if item["location"]:
                lines.append(f'location = "{item["location"]}"')
            if item["camera"]:
                lines.append(f'camera = "{item["camera"]}"')
            if item["lens"]:
                lines.append(f'lens = "{item["lens"]}"')
            if item["aperture"]:
                lines.append(f'aperture = "{item["aperture"]}"')
            if item["shutter"]:
                lines.append(f'shutter = "{item["shutter"]}"')
            if item["iso"]:
                lines.append(f'iso = "{item["iso"]}"')
            if item["focal_length"]:
                lines.append(f'focal_length = "{item["focal_length"]}"')
            lines.append(f'image = "{item["image"]}"')
            if item["content"]:
                lines.append(f'content = """{item["content"]}"""')
            lines.append("")
        path.write_text("\n".join(lines), encoding="utf-8")

    write_toml(ROOT / "content" / "gallery.toml", gallery_items, en=True)
    write_toml(ROOT / "content_zh" / "gallery.toml", gallery_items, en=False)

    # ---- Generate markdown files ----
    def write_md(dir_path: Path, item: dict):
        md = f"""---
title: "{item['title']}"
date: "{item['date']}"
slug: "{item['slug']}"
location: "{item['location']}"
camera: "{item['camera']}"
lens: "{item['lens']}"
aperture: "{item['aperture']}"
shutter: "{item['shutter']}"
iso: "{item['iso']}"
focal_length: "{item['focal_length']}"
image: "{item['image']}"
---

{item['content']}
"""
        dir_path.mkdir(parents=True, exist_ok=True)
        (dir_path / f"{item['slug']}.md").write_text(md, encoding="utf-8")

    for item in gallery_items:
        write_md(ROOT / "content" / "gallery", item)
        write_md(ROOT / "content_zh" / "gallery", item)

    print(f"Generated {len(gallery_items)} gallery entries.")

    # Clean up stale entries
    active_slugs = {item["slug"] for item in gallery_items}
    for md_dir in (ROOT / "content" / "gallery", ROOT / "content_zh" / "gallery"):
        for old_md in md_dir.glob("*.md"):
            if old_md.stem not in active_slugs:
                old_md.unlink()
                print(f"Removed stale: {old_md}")

    for old_img in PUBLIC_GALLERY.glob("*.jpg"):
        if old_img.stem not in active_slugs:
            old_img.unlink()
            print(f"Removed stale image: {old_img}")

    print("\nDone! Run 'npm run build' to rebuild the site.")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        generate_gallery(Path(sys.argv[1]))
    else:
        generate_gallery()
