"""
Generate gallery TOML and markdown files from a folder of photos.
Reads EXIF data for automatic metadata extraction.

Usage:
  python scripts/generate-gallery.py [photos_dir]

  photos_dir defaults to public/gallery-photos/
  Outputs: content/gallery.toml + content/gallery/*.md (zh version too)
"""

import os
import sys
import shutil
from pathlib import Path
from datetime import datetime
from PIL import Image
from PIL.ExifTags import TAGS

ROOT = Path(__file__).resolve().parent.parent
PUBLIC_GALLERY = ROOT / "public" / "gallery"
PHOTOS_DIR = ROOT / "public" / "gallery-photos"


def get_exif(path: Path) -> dict:
    """Extract EXIF metadata from an image."""
    data = {}
    try:
        img = Image.open(path)
        exif = img._getexif() if hasattr(img, '_getexif') else None
        if exif:
            for tag_id, value in exif.items():
                tag = TAGS.get(tag_id, tag_id)
                # Handle bytes values (common in ImageDescription, UserComment, etc.)
                if isinstance(value, bytes):
                    try:
                        value = value.decode('utf-8', errors='replace').strip('\x00').strip()
                    except Exception:
                        value = str(value)
                else:
                    value = str(value).strip()
                data[tag] = value
    except Exception:
        pass
    return data


def get_description(img_path: Path, exif: dict) -> str:
    """Get photo description from sidecar file > EXIF > auto-generated."""
    # Priority 1: .txt sidecar file
    sidecar = img_path.with_suffix('.txt')
    if sidecar.exists():
        return sidecar.read_text(encoding='utf-8').strip()

    # Priority 2: EXIF ImageDescription (Lightroom Caption field)
    desc = exif.get('ImageDescription', '')
    if desc:
        return desc

    # Priority 3: EXIF UserComment
    desc = exif.get('UserComment', '')
    if desc:
        return desc

    # Fallback: auto-generated placeholder
    cam = exif.get('Model', '')
    date = parse_date(exif)
    parts = []
    if cam:
        parts.append(cam)
    if date:
        parts.append(date)
    if parts:
        return f"Shot with {' · '.join(parts)}."
    return ""


def parse_date(exif: dict) -> str:
    """Extract and format date from EXIF."""
    raw = exif.get('DateTimeOriginal', exif.get('DateTime', ''))
    if not raw:
        return ""
    try:
        dt = datetime.strptime(raw, "%Y:%m:%d %H:%M:%S")
        return dt.strftime("%Y-%m")
    except ValueError:
        return ""


def slugify(title: str) -> str:
    """Create a URL-safe slug."""
    slug = title.lower().strip()
    slug = ''.join(c for c in slug if c.isalnum() or c in ' -_')
    slug = slug.replace(' ', '-')
    return slug[:60]


def generate_gallery(photos_dir: Path = None):
    if photos_dir is None:
        photos_dir = PHOTOS_DIR

    if not photos_dir.exists():
        print(f"Photos directory not found: {photos_dir}")
        print("Create it and add your photos, then re-run this script.")
        return

    images = []
    for ext in ('*.jpg', '*.jpeg', '*.png', '*.webp'):
        images.extend(photos_dir.glob(ext))

    if not images:
        print("No images found in", photos_dir)
        return

    print(f"Found {len(images)} photos.")

    # Ensure public/gallery exists
    PUBLIC_GALLERY.mkdir(parents=True, exist_ok=True)

    gallery_items = []
    for img_path in sorted(images, key=lambda p: p.name):
        exif = get_exif(img_path)
        date = parse_date(exif)
        cam = exif.get('Model', '')

        # Generate title from filename (strip extension, replace separators)
        stem = img_path.stem
        title = stem.replace('_', ' ').replace('-', ' ').title()

        slug = slugify(stem)
        # Ensure unique slug
        base_slug = slug
        counter = 1
        while any(item['slug'] == slug for item in gallery_items):
            slug = f"{base_slug}-{counter}"
            counter += 1

        # Copy to public/gallery
        dest = PUBLIC_GALLERY / f"{slug}.jpg"
        if img_path.suffix.lower() in ('.png', '.webp'):
            # Convert to JPEG for consistency
            try:
                img = Image.open(img_path)
                rgb = img.convert('RGB')
                rgb.save(dest, 'JPEG', quality=85)
            except Exception:
                shutil.copy2(img_path, dest)
        else:
            shutil.copy2(img_path, dest)

        image_url = f"/gallery/{slug}.jpg"

        # Determine location from EXIF or use empty
        location = ""
        # Try GPS data
        gps_lat = exif.get('GPSInfo', '')
        if 'N' in gps_lat or 'S' in gps_lat:
            location = "From EXIF GPS"

        description = get_description(img_path, exif)

        gallery_items.append({
            'title': title,
            'slug': slug,
            'date': date or datetime.now().strftime("%Y-%m"),
            'location': location,
            'camera': cam or 'Unknown',
            'image': image_url,
            'content': description,
        })

    # Sort by date descending
    gallery_items.sort(key=lambda x: x['date'], reverse=True)

    # --- Generate English gallery.toml ---
    toml_en = ROOT / "content" / "gallery.toml"
    lines = [
        'type = "gallery"',
        'title = "Gallery"',
        'description = "Moments captured through my lens — urban exploration, landscapes, and the stories behind each frame."',
        ''
    ]
    for item in gallery_items:
        lines.append('[[items]]')
        lines.append(f'title = "{item["title"]}"')
        lines.append(f'slug = "{item["slug"]}"')
        lines.append(f'date = "{item["date"]}"')
        if item['location']:
            lines.append(f'location = "{item["location"]}"')
        if item['camera']:
            lines.append(f'camera = "{item["camera"]}"')
        lines.append(f'image = "{item["image"]}"')
        lines.append(f'content = "{item["content"]}"')
        lines.append('')
    toml_en.write_text('\n'.join(lines), encoding='utf-8')
    print(f"Wrote {toml_en}")

    # --- Generate Chinese gallery.toml ---
    toml_zh = ROOT / "content_zh" / "gallery.toml"
    lines = [
        'type = "gallery"',
        'title = "摄影"',
        'description = "镜头里的世界 — 城市探索、风光与每帧背后的故事。"',
        ''
    ]
    for item in gallery_items:
        lines.append('[[items]]')
        lines.append(f'title = "{item["title"]}"')
        lines.append(f'slug = "{item["slug"]}"')
        lines.append(f'date = "{item["date"]}"')
        if item['location']:
            lines.append(f'location = "{item["location"]}"')
        if item['camera']:
            lines.append(f'camera = "{item["camera"]}"')
        lines.append(f'image = "{item["image"]}"')
        lines.append(f'content = "{item["content"]}"')
        lines.append('')
    toml_zh.write_text('\n'.join(lines), encoding='utf-8')
    print(f"Wrote {toml_zh}")

    # --- Generate individual markdown files ---
    gallery_content = ROOT / "content" / "gallery"
    gallery_content_zh = ROOT / "content_zh" / "gallery"
    gallery_content.mkdir(parents=True, exist_ok=True)
    gallery_content_zh.mkdir(parents=True, exist_ok=True)

    for item in gallery_items:
        md = f"""---
title: "{item['title']}"
date: "{item['date']}"
location: "{item['location']}"
camera: "{item['camera']}"
image: "{item['image']}"
---

{item['content']}
"""
        (gallery_content / f"{item['slug']}.md").write_text(md, encoding='utf-8')
        (gallery_content_zh / f"{item['slug']}.md").write_text(md, encoding='utf-8')

    print(f"Generated {len(gallery_items)} gallery entries.")

    # Clean up old entries that no longer have corresponding photos
    active_slugs = {item['slug'] for item in gallery_items}
    for md_dir in (gallery_content, gallery_content_zh):
        for old_md in md_dir.glob("*.md"):
            if old_md.stem not in active_slugs:
                old_md.unlink()
                print(f"Removed stale: {old_md}")

    # Remove old gallery images not in active set
    active_files = {f"{s}.jpg" for s in active_slugs}
    for old_img in PUBLIC_GALLERY.glob("*.jpg"):
        if old_img.name not in active_files:
            old_img.unlink()
            print(f"Removed stale image: {old_img}")

    print("\nDone! Run 'npm run build' to rebuild the site.")


if __name__ == '__main__':
    if len(sys.argv) > 1:
        generate_gallery(Path(sys.argv[1]))
    else:
        generate_gallery()
