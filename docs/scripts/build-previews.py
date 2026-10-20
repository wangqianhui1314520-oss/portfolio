#!/usr/bin/env python3
"""Cut the short, silent preview loops shown in the work archive.

Each loop is five seconds from a project's own video, framed at the 16:10
cover ratio. Portrait footage is centred on a blurred copy of itself.
Requires ffmpeg on PATH. Usage: python scripts/build-previews.py
"""
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets' / 'videos'
OUTPUT = SOURCE / 'previews'
DURATION = 5
CRF = 31
# Project id: (start second, chosen for movement that reads at card size)
CLIPS = {
    'yuanmo': 10.6,   # choosing a lord: the painted portraits and the chosen ruler's card
    'growth': 10.5,   # the archived kindergarten gate and the first clues
    'zhihu': 9.0,     # the case board, then the suspect line-up
    'rebirth': 34.0,  # walking through the red-lit laboratory
    'epoch': 38.0,    # the awakening hall of the mechanical era
}


def probe(file):
    out = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height',
                          '-of', 'csv=p=0', str(file)], capture_output=True, text=True, check=True).stdout
    width, height = (int(v) for v in out.strip().split(',')[:2])
    return width, height


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for project, start in CLIPS.items():
        source = SOURCE / f'{project}.mp4'
        width, height = probe(source)
        if width < height:
            # Portrait: the footage stays whole in front of its own blurred, darkened enlargement.
            graph = ('[0:v]split[a][b];'
                     '[a]scale=960:600:force_original_aspect_ratio=increase,crop=960:600,boxblur=24:2,eq=brightness=-0.18[bg];'
                     '[b]scale=-2:600[fg];[bg][fg]overlay=(W-w)/2:0,format=yuv420p')
        else:
            # Landscape: crop the centre to 16:10, never enlarging past the source height.
            target = min(600, height)
            graph = (f'[0:v]crop=min(iw\\,ih*1.6):min(ih\\,iw/1.6),'
                     f'scale={round(target * 1.6 / 2) * 2}:{target},format=yuv420p')
        target_file = OUTPUT / f'{project}.mp4'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(start), '-t', str(DURATION), '-i', str(source),
                        '-filter_complex', graph, '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', str(CRF),
                        '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(target_file)],
                       check=True)
        print(f'{target_file.relative_to(ROOT).as_posix()}: {target_file.stat().st_size // 1024} KB')


if __name__ == '__main__':
    main()
