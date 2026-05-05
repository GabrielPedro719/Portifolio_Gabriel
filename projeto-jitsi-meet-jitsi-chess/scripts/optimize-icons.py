from pathlib import Path
from PIL import Image

ROOT = Path('/home/ubuntu/jitsi-chess-mobile')
source = Path('/home/ubuntu/webdev-static-assets/jitsi-chess-icon.png')
targets = [
    ROOT / 'assets/images/icon.png',
    ROOT / 'assets/images/splash-icon.png',
    ROOT / 'assets/images/favicon.png',
    ROOT / 'assets/images/android-icon-foreground.png',
]

with Image.open(source) as img:
    img = img.convert('RGB')
    img = img.resize((1024, 1024), Image.Resampling.LANCZOS)
    for target in targets:
        target.parent.mkdir(parents=True, exist_ok=True)
        img.save(target, format='PNG', optimize=True, compress_level=9)
        print(f'{target}: {target.stat().st_size / 1024:.1f}KB')
