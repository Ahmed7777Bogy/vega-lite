#!/usr/bin/env python3
"""المونتاج النهائي لإعلان حسابك: مشاهد Veo + جرافيكس التقارير والترجمة + التعليق الصوتي + مؤثرات صوتية نظيفة.

المدخلات:
  video/veo/clips/V1.mp4 … V5B.mp4        مشاهد Veo (9:16)
  video/motion/frames/f00000.png …       طبقة الجرافيكس الشفافة (tools/render-motion.js)
  video/motion/timeline.json             توقيت المشاهد
  video/voiceover/v2/mostafa-take1.mp3   التعليق الصوتي
  video/sfx/*.mp3                        المؤثرات الصوتية (ElevenLabs)
المخرج:
  video/final/Hesabak-Ad-9x16.mp4
"""
import json, subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
V = ROOT / 'video'
CLIPS = V / 'veo' / 'clips'
OUT = V / 'final'
OUT.mkdir(exist_ok=True)
TL = json.loads((V / 'motion' / 'timeline.json').read_text())
S, TOTAL, FPS, OFF = TL['SCENES'], TL['TOTAL'], TL['FPS'], TL['OFF']
VO = V / 'voiceover' / 'v2' / 'mostafa-take1.mp3'
# صوت Veo مش مستخدم: كان فيه كلام مش مفهوم (مش عربي). المؤثرات نظيفة من ElevenLabs ومتوقّتة على القطعات.
SFX = V / 'sfx'
CUES = [  # (الملف، الثانية، مستوى الصوت)
    ('receipt', 1.0, 0.45),
    ('whoosh', S['s2'] - 0.25, 0.55), ('coins', S['s2'] + 1.0, 0.40),
    ('whoosh', S['s3'] - 0.25, 0.55), ('kitchen', S['s3'] + 0.2, 0.55), ('coins', S['s3'] + 1.6, 0.30),
    ('whoosh', S['s4a'] - 0.25, 0.60), ('send', S['s4a'] + 0.7, 0.50),
    ('whoosh', S['s4b'] - 0.25, 0.55), ('shimmer', S['s4b'] + 0.4, 0.45),
    ('whoosh', S['s5'] - 0.25, 0.55), ('shimmer', S['s5'] + 0.6, 0.35),
    ('whoosh', S['s5b'] - 0.25, 0.55), ('ding', S['s5b'] + 0.2, 0.55),
    ('logo-hit', S['end'] + 0.05, 0.55),
]

order = [('V1', 's1', 's2'), ('V2', 's2', 's3'), ('V3', 's3', 's4a'), ('V4A', 's4a', 's4b'),
         ('V4B', 's4b', 's5'), ('V5', 's5', 's5b'), ('V5B', 's5b', 'end')]


def dur(p):
    return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(p)],
                                capture_output=True, text=True, check=True).stdout)


inputs, fv, fa = [], [], []
for k, (clip, a, b) in enumerate(order):
    p = CLIPS / f'{clip}.mp4'
    need = (S[b] - S[a]) + (TOTAL - S['end'] if b == 'end' else 0)
    have = dur(p)
    inputs += ['-i', str(p)]
    # لو المشهد أقصر من مكانه: نبطّأه شوية (لحد 0.8) وبعدين نثبت آخر فريم
    speed = max(0.8, min(1.0, have / need)) if have < need else 1.0
    pad = max(0.0, need - have / speed)
    fv.append(f'[{k}:v]setpts=PTS/{speed:.4f},fps={FPS},scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,'
              f'setsar=1,tpad=stop_mode=clone:stop_duration={pad:.3f},trim=0:{need:.3f},setpts=PTS-STARTPTS[v{k}]')

n = len(order)
inputs += ['-framerate', str(FPS), '-i', str(V / 'motion' / 'frames' / 'f%05d.png')]
inputs += ['-i', str(VO)]
ov, vo = n, n + 1
for j, (name, t, g) in enumerate(CUES):
    inputs += ['-i', str(SFX / f'{name}.mp3')]
    ms = int(max(0, t) * 1000)
    fa.append(f'[{n + 2 + j}:a]aresample=48000,volume={g},adelay={ms}|{ms}[a{j}]')
filters = fv + fa + [
    ''.join(f'[v{k}]' for k in range(n)) + f'concat=n={n}:v=1:a=0[base]',
    f'[base][{ov}:v]overlay=0:0:format=auto,format=yuv420p[vout]',
    f'[{vo}:a]aresample=48000,adelay={int(OFF * 1000)}|{int(OFF * 1000)},volume=1.0[vo]',
    ''.join(f'[a{j}]' for j in range(len(CUES))) + f'[vo]amix=inputs={len(CUES) + 1}:normalize=0:duration=longest,'
    f'apad=whole_dur={TOTAL},atrim=0:{TOTAL},loudnorm=I=-14:TP=-1.0:LRA=9,aresample=48000[aout]',
]
out = OUT / 'Hesabak-Ad-9x16.mp4'
subprocess.run(['ffmpeg', '-y', '-v', 'error', *inputs, '-filter_complex', ';'.join(filters),
                '-map', '[vout]', '-map', '[aout]', '-t', str(TOTAL),
                '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-profile:v', 'high', '-r', str(FPS),
                '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-movflags', '+faststart', str(out)], check=True)
# نسخة واتساب أخف
subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(out), '-c:v', 'libx264', '-preset', 'slow', '-b:v', '2200k',
                '-maxrate', '2600k', '-bufsize', '5200k', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart',
                str(OUT / 'Hesabak-Ad-9x16-WhatsApp.mp4')], check=True)
print('done:', out)
