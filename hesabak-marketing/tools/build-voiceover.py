#!/usr/bin/env python3
"""يولّد التعليق الصوتي المصري لإعلان حسابك من ElevenLabs ويركّبه على الـ Animatic.

المتطلبات:
  ELEVENLABS_API_KEY   مفتاح ElevenLabs (متغير بيئة، ممنوع يتكتب في الكود)
  ELEVENLABS_VOICE_ID  الـ Voice ID لصوت راجل مصري من Voice Library
  ELEVENLABS_MODEL_ID  اختياري (الافتراضي eleven_multilingual_v2)
  ELEVENLABS_SPEED     اختياري (الافتراضي 1.12)
  ملحوظة: الجمل اللي اتولّدت قبل كده في lines/ بيُعاد استخدامها. امسحها لو غيّرت الصوت أو السرعة.
  ffmpeg / ffprobe

الاستخدام:
  python3 tools/build-voiceover.py              # توليد حقيقي من ElevenLabs
  python3 tools/build-voiceover.py --test-tones # اختبار التركيب بنغمات بدل الصوت (من غير API)

المخرجات (في video/voiceover/):
  lines/NN.mp3                          كل جملة لوحدها (للمونتاج في CapCut)
  Hesabak-60s-VO.wav                    التعليق كامل 60 ثانية متظبط على التوقيتات
  ../animatic/Hesabak-60s-Animatic-with-VO.mp4
"""
import json, os, subprocess, sys, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
V = ROOT / 'video'
OUT = V / 'voiceover'
LINES_DIR = OUT / 'lines'
ANIMATIC = V / 'animatic' / 'Hesabak-60s-Animatic-PREVIEW.mp4'

# (بداية الجملة، آخر وقت مسموح، النص) — نفس توقيتات PRODUCTION-PACKAGE.md
LINES = [
    (0.5, 6.0, 'عندك صيدلية، وبتبيع كل يوم...'),
    (6.2, 10.0, 'بس عارف فعلاً بتكسب كام؟'),
    (10.3, 16.0, 'أو محل قطع غيار، والمخزن مليان...'),
    (16.2, 20.0, 'بس مش عارف فلوسك رايحة فين؟'),
    (20.3, 26.0, 'أو مطعم وكافيه... المبيعات شغالة،'),
    (26.2, 30.0, 'لكن المصاريف بتاكل أرباحك؟'),
    (30.2, 34.0, 'مع حسابك، ابعت بياناتك على واتساب،'),
    (34.2, 39.0, 'وإحنا نساعدك تنظم حساباتك،'),
    (39.2, 43.0, 'وتفهم أرباحك ومصاريفك ومخزونك.'),
    (43.0, 48.5, 'تقارير واضحة، ومتابعة مالية أونلاين، وتوفير في تكلفة إدارة الحسابات...'),
    (48.6, 52.2, 'من غير ما تحتاج محاسب موجود عندك طول الوقت.'),
    (52.3, 55.7, 'حسابك... حساباتك واضحة، وقراراتك أذكى.'),
    (55.8, 59.9, 'باقات تبدأ من خمسة آلاف جنيه شهرياً لكل فرع.'),
]
MAX_TEMPO = 1.2  # أقصى تسريع مقبول قبل ما الصوت يبان مستعجل
SPEED = float(os.environ.get('ELEVENLABS_SPEED', '1.12'))  # سرعة الكلام في ElevenLabs (0.7–1.2)
TRIM = 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse'


def run(*args):
    return subprocess.run(args, check=True, capture_output=True, text=True).stdout


def duration(path):
    return float(run('ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(path)))


def tts(text, out):
    key, voice = os.environ.get('ELEVENLABS_API_KEY'), os.environ.get('ELEVENLABS_VOICE_ID')
    if not key or not voice:
        sys.exit('محتاج ELEVENLABS_API_KEY و ELEVENLABS_VOICE_ID كمتغيرات بيئة.')
    body = json.dumps({
        'text': text,
        'model_id': os.environ.get('ELEVENLABS_MODEL_ID', 'eleven_multilingual_v2'),
        'language_code': 'ar',
        'voice_settings': {'stability': 0.45, 'similarity_boost': 0.8, 'style': 0.35, 'use_speaker_boost': True, 'speed': SPEED},
    }).encode()
    req = urllib.request.Request(
        f'https://api.elevenlabs.io/v1/text-to-speech/{voice}?output_format=mp3_44100_128',
        data=body, headers={'xi-api-key': key, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg'})
    with urllib.request.urlopen(req, timeout=120) as r:
        out.write_bytes(r.read())


def tone(text, out):
    # بديل للاختبار: نغمة طولها تقريبي على حسب عدد الكلمات (2.6 كلمة/ثانية)
    d = max(1.0, len(text.split()) / 2.6)
    run('ffmpeg', '-y', '-v', 'error', '-f', 'lavfi', '-i', f'sine=frequency=330:duration={d}', '-b:a', '128k', str(out))


def main():
    test = '--test-tones' in sys.argv
    LINES_DIR.mkdir(parents=True, exist_ok=True)
    fitted, warnings = [], []
    for i, (start, end, text) in enumerate(LINES, 1):
        raw = LINES_DIR / f'{i:02d}.mp3'
        if not raw.exists() or test:
            (tone if test else tts)(text, raw)
        trimmed = OUT / 'trimmed' / f'{i:02d}.wav'
        trimmed.parent.mkdir(exist_ok=True)
        run('ffmpeg', '-y', '-v', 'error', '-i', str(raw), '-af', TRIM, str(trimmed))
        slot, d = end - start, duration(trimmed)
        tempo = 1.0
        if d > slot:
            tempo = d / slot
            if tempo > MAX_TEMPO:
                warnings.append(f'جملة {i} طولها {d:.1f}s والمسموح {slot:.1f}s: محتاجة تسريع ×{tempo:.2f}. يُفضّل تعيد توليدها بإيقاع أسرع أو تمد المشهد.')
                tempo = MAX_TEMPO
        fitted.append((start, trimmed, tempo))
        print(f'{i:02d}  {start:5.1f}s  {d:4.1f}s / {slot:3.1f}s  tempo={tempo:.2f}  {text}')

    # تركيب الجمل على تايملاين 60 ثانية
    inputs, filters = [], []
    for k, (start, raw, tempo) in enumerate(fitted):
        inputs += ['-i', str(raw)]
        ms = int(start * 1000)
        filters.append(f'[{k}:a]aresample=48000,atempo={tempo:.3f},adelay={ms}|{ms}[a{k}]')
    mix = ''.join(f'[a{k}]' for k in range(len(fitted)))
    filters.append(f'{mix}amix=inputs={len(fitted)}:normalize=0,apad=whole_dur=60,atrim=0:60,'
                   'highpass=f=80,acompressor=threshold=-18dB:ratio=3:attack=5:release=120,loudnorm=I=-16:TP=-1.5:LRA=7[vo]')
    vo = OUT / ('Hesabak-60s-VO-TEST.wav' if test else 'Hesabak-60s-VO.wav')
    run('ffmpeg', '-y', '-v', 'error', *inputs, '-filter_complex', ';'.join(filters), '-map', '[vo]', '-ac', '2', '-ar', '48000', '-c:a', 'pcm_s24le', str(vo))

    final = V / 'animatic' / ('Hesabak-60s-Animatic-VO-TEST.mp4' if test else 'Hesabak-60s-Animatic-with-VO.mp4')
    run('ffmpeg', '-y', '-v', 'error', '-i', str(ANIMATIC), '-i', str(vo), '-map', '0:v', '-map', '1:a',
        '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-shortest', '-movflags', '+faststart', str(final))
    print('\nVO:', vo, '\nMP4:', final)
    for w in warnings:
        print('⚠️', w)


if __name__ == '__main__':
    main()
