"""Replace website photos without touching any code.

How to use (see new-images/READ-ME-FIRST.txt):
  1. Put the new photo in the "new-images" folder, named after the photo it replaces,
     for example  sconces-03.jpg  or  hero-bedroom.png   (JPG, PNG or WEBP).
  2. Double-click  update-images.bat  in the project folder.

This script resizes each photo to the sizes the website needs, saves it over the old one,
refreshes the card backdrop colours, and moves your original into new-images/done.
"""
import importlib.util
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INBOX = ROOT / "new-images"
DONE = INBOX / "done"
PHOTO_TYPES = {".jpg", ".jpeg", ".png", ".webp"}
FIXTURE_NAME = re.compile(r"^(sconces|ceiling|chandeliers)-(\d{2})$")


def ensure_pillow():
    """The image library (Pillow) is installed automatically the first time."""
    if importlib.util.find_spec("PIL"):
        return
    print("Installing the image library (Pillow). This happens once and needs internet...", flush=True)
    command = [sys.executable, "-m", "pip", "install", "--quiet", "--disable-pip-version-check"]
    if sys.prefix == sys.base_prefix:  # normal Python, not a virtual environment
        command.append("--user")
    subprocess.check_call(command + ["Pillow"])
    # Start again so the newly installed library is found.
    sys.exit(subprocess.call([sys.executable, str(Path(__file__).resolve())]))


def main():
    ensure_pillow()
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from PIL import Image, ImageOps
    from extract_images import HERO_NAMES, make_og, save, write_tones

    INBOX.mkdir(exist_ok=True)
    photos = sorted(p for p in INBOX.iterdir() if p.is_file() and p.suffix.lower() in PHOTO_TYPES)
    if not photos:
        print('No photos found in the "new-images" folder. Put a photo there first, then run this again.')
        return

    updated, skipped, fixtures_changed = [], [], False
    for photo in photos:
        name = photo.stem.lower().strip()
        try:
            with Image.open(photo) as opened:
                img = ImageOps.exif_transpose(opened).convert("RGB")  # respects phone rotation
        except Exception:
            skipped.append((photo.name, "this file could not be opened as a picture"))
            continue

        fixture = FIXTURE_NAME.match(name)
        if name.startswith("hero-") and name[5:] in HERO_NAMES:
            room = name[5:]
            if img.width < img.height:
                skipped.append((photo.name, "room photos must be wide (landscape), this one is tall"))
                continue
            save(img, ROOT / f"assets/img/hero/{room}.webp", 1600, 76)
            save(img, ROOT / f"assets/img/hero/{room}-800.webp", 800, 74)
            if room == "living":  # this photo is also the link-preview picture
                make_og(img, ROOT / "og-image.jpg")
        elif fixture and (ROOT / f"assets/img/fixtures/{name}.webp").exists():
            full_width = round(img.width * 1400 / img.height) if img.height > 1400 else None
            save(img, ROOT / f"assets/img/fixtures/{name}.webp", full_width, 80)
            save(img, ROOT / f"assets/img/fixtures/{name}-480.webp", 480, 76)
            fixtures_changed = True
        else:
            skipped.append((photo.name, "the name does not match any photo on the website (see IMAGE-NAMES.txt)"))
            continue

        DONE.mkdir(exist_ok=True)
        shutil.move(str(photo), str(DONE / f"{time.strftime('%Y%m%d-%H%M%S')}-{photo.name}"))
        updated.append(photo.name)

    if fixtures_changed:
        write_tones()

    print()
    for name in updated:
        print(f"  UPDATED   {name}")
    for name, reason in skipped:
        print(f"  SKIPPED   {name}  ->  {reason}")
    print()
    if updated:
        print("Done. Double-click preview.bat to check the website on this computer.")
        print("If the old photo still shows, press Ctrl+F5 in the browser to refresh.")
        print("The website on the internet only changes after the files are published.")


if __name__ == "__main__":
    main()
