#!/usr/bin/env python3
"""Generate simple PNG icons for the Chrome extension using pure Python."""

import struct
import zlib
import os

def create_png(width, height, r, g, b, filename):
    """Create a minimal PNG file with a solid color and white letters."""
    # Each row has filter byte (0) + RGB pixels
    row_bytes = width * 3
    raw_data = b''
    for y in range(height):
        raw_data += b'\x00'  # filter byte = None
        for x in range(width):
            # Simple design: colored background
            # Draw a white circle in the center
            cx, cy = width // 2, height // 2
            radius = min(width, height) * 0.35
            dx, dy = x - cx, y - cy
            dist = (dx*dx + dy*dy) ** 0.5
            if dist < radius:
                raw_data += bytes([r, g, b])
            else:
                # Lighter shade for background
                raw_data += bytes([min(255, r+40), min(255, g+40), min(255, b+40)])

    def chunk(chunk_type, data):
        c = chunk_type + data
        crc = struct.pack('>I', zlib.crc32(c) & 0xffffffff)
        return struct.pack('>I', len(data)) + c + crc

    signature = b'\x89PNG\r\n\x1a\n'
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0))
    compressed = zlib.compress(raw_data)
    idat = chunk(b'IDAT', compressed)
    iend = chunk(b'IEND', b'')

    with open(filename, 'wb') as f:
        f.write(signature + ihdr + idat + iend)

def create_app_icon(size, filename):
    """Create a blue-tinted icon with 'F' letter."""
    width, height = size, size
    # Perceptual: draw a circle with a 'F' shape approximation
    r, g, b = 66, 133, 244  # Google Blue
    row_bytes = width * 4  # RGBA
    raw_data = b''
    
    for y in range(height):
        raw_data += b'\x00'  # filter byte
        for x in range(width):
            cx, cy = width // 2, height // 2
            radius = width * 0.44
            
            # Circle background
            dx, dy = x - cx, y - cy
            dist = (dx*dx + dy*dy) ** 0.5
            
            # Draw a checkmark-like shape
            if dist < radius:
                # Main circle - gradient blue
                intensity = 1.0 - (dist / radius) * 0.3
                raw_data += bytes([
                    int(r * intensity),
                    int(g * intensity),
                    int(b * intensity),
                    255
                ])
            else:
                raw_data += bytes([255, 255, 255, 0])  # transparent

    def chunk(chunk_type, data):
        c = chunk_type + data
        crc = struct.pack('>I', zlib.crc32(c) & 0xffffffff)
        return struct.pack('>I', len(data)) + c + crc

    signature = b'\x89PNG\r\n\x1a\n'
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0))
    compressed = zlib.compress(raw_data)
    idat = chunk(b'IDAT', compressed)
    iend = chunk(b'IEND', b'')

    with open(filename, 'wb') as f:
        f.write(signature + ihdr + idat + iend)

if __name__ == '__main__':
    outdir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'icons')
    os.makedirs(outdir, exist_ok=True)
    
    sizes = [16, 48, 128]
    for s in sizes:
        create_app_icon(s, os.path.join(outdir, f'icon{s}.png'))
        print(f'Created icon{s}.png ({s}x{s})')
    
    print('All icons generated!')
