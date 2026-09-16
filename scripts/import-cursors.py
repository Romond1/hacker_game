"""Convert selected Windows CUR/ANI artwork to browser PNG cursor assets.

Run with Pillow installed: python scripts/import-cursors.py
The original downloads stay in TRAINING CENTER/Assets/Cursors; the shop serves only PNGs.
"""

from io import BytesIO
from pathlib import Path
import struct

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "TRAINING CENTER" / "Assets" / "Cursors"
DEST = ROOT / "public" / "cursors"


def frames_from_ani(data: bytes) -> list[bytes]:
    frames = []
    offset = 0
    while (position := data.find(b"icon", offset)) >= 0:
        size = struct.unpack_from("<I", data, position + 4)[0]
        cursor = data[position + 8 : position + 8 + size]
        if cursor[:4] in (b"\0\0\1\0", b"\0\0\2\0"):
            frames.append(cursor)
        offset = position + 4
    return frames


def decode_cursor(data: bytes, target_size: int) -> tuple[Image.Image, tuple[int, int]]:
    count = struct.unpack_from("<H", data, 4)[0]
    entries = [struct.unpack_from("<BBBBHHII", data, 6 + index * 16) for index in range(count)]
    entry = min(entries, key=lambda value: abs((value[0] or 256) - target_size))
    width, height, _, _, hot_x, hot_y, size, offset = entry
    width, height = width or 256, height or 256
    dib = data[offset : offset + size]
    header_size, _, _, _, bits, _, _, _, _, colors_used, _ = struct.unpack_from("<IiiHHIIiiII", dib)
    if bits == 32:
        image = Image.frombytes("RGBA", (width, height), dib[header_size : header_size + width * height * 4], "raw", "BGRA", 0, -1)
    else:
        # Pillow decodes the palette. The Windows AND mask still needs applying.
        single = b"\0\0\2\0\1\0" + struct.pack("<BBBBHHII", width % 256, height % 256, 0, 0, hot_x, hot_y, size, 22) + dib
        image = Image.open(BytesIO(single)).convert("RGBA")
    xor_stride = ((width * bits + 31) // 32) * 4
    and_stride = ((width + 31) // 32) * 4
    and_offset = header_size + (colors_used or (1 << bits)) * 4 + xor_stride * height if bits < 32 else header_size + xor_stride * height
    pixels = image.load()
    for y in range(height):
        for x in range(width):
            if dib[and_offset + (height - y - 1) * and_stride + x // 8] & (1 << (7 - x % 8)):
                pixels[x, y] = (0, 0, 0, 0)
    return image, (hot_x, hot_y)


def main() -> None:
    DEST.mkdir(parents=True, exist_ok=True)
    static = {
        "cool-blue-ver4-droplet-a8c8b91f.cur": "cursor-glacier",
        "cool-blue-ver4-holographic-7c23561e.cur": "cursor-hologram",
    }
    for filename, stem in static.items():
        data = (SOURCE / filename).read_bytes()
        for size, suffix in [(48, ""), (48, "-large"), (128, "-preview")]:
            image, hotspot = decode_cursor(data, size)
            if suffix == "":
                image = image.resize((40, 40), Image.Resampling.LANCZOS)
                hotspot = (round(hotspot[0] * 40 / size), round(hotspot[1] * 40 / size))
            image.save(DEST / f"{stem}{suffix}.png", optimize=True)
            print(f"{stem}{suffix}: {image.size}, hotspot {hotspot}")
    animated = {
        "green_sparkle.ani": "cursor-ani-spark",
        "white_spaceship.ani": "cursor-ani-ship",
        "lightsaber.ani": "cursor-ani-sabre",
    }
    for filename, stem in animated.items():
        frames = frames_from_ani((SOURCE / filename).read_bytes())
        for index, data in enumerate(frames):
            image, hotspot = decode_cursor(data, 32)
            image.save(DEST / f"{stem}-frame-{index}.png", optimize=True)
            if index == 0:
                image.resize((40, 40), Image.Resampling.NEAREST).save(DEST / f"{stem}-static.png", optimize=True)
                image.resize((48, 48), Image.Resampling.NEAREST).save(DEST / f"{stem}-large.png", optimize=True)
        print(f"{stem}: {len(frames)} frames, hotspot {hotspot}")


if __name__ == "__main__":
    main()
