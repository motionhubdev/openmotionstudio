"""Cut the website's hero film (media/studio-loop.<lang>.mp4 on openmotion.studio) from a take of shoot.sh.
Usage: cut.py RUN_DIR MUSIC [OUT_DIR]

MUSIC is Cat Walk by Arulo (Mixkit free licence: https://mixkit.co/free-stock-music/ , track 371), not kept here.
Each shot is rendered to its own short file from a seek into raw.mp4, then the shots are joined by cuts or a
crossfade, between the opening and closing cards (card-open.mp4, card-close.mp4 beside this file). Times come from
the take's marks.json, so a new take cuts the same way. Each chapter has a caption, burned in once per language; the
chapters' start times are printed and written to chapters.json for the website's steps.

The music runs from the track's second build: its drop falls as the new version plays (chapter 6), and the agent's
turn before it is sped up to whatever length puts it there."""
import json
import os
import subprocess
import sys

here = os.path.dirname(os.path.abspath(__file__))
run = os.path.abspath(sys.argv[1])
music = os.path.abspath(sys.argv[2])
out_dir = os.path.abspath(sys.argv[3] if len(sys.argv) > 3 else run)
os.chdir(run)
start = int(open("rec-start").read())
m = {x["name"]: (x["at"] - start) / 1000 for x in json.load(open("marks.json"))}
FPS = 30

# Parts of the 1920x1080 take, each scaled to 1440x810.
HOME = "crop=1500:844:310:40"        # the brief at Home
STAGE = "crop=1184:666:390:52"       # the film and its controls
LEFT_BOTTOM = "crop=1280:720:0:360"  # the composer and the timeline
DIALOG = "crop=1536:864:192:108"     # a dialog in the middle
# The assistant close, while it works: the foot of its panel, where the message and its steps are, over the composer.
AGENT = "crop=864:486:0:540,scale=1440:810:flags=lanczos"
SPOT = "drawbox=x=716:y=0:w=724:h=810:color=black@0.72:t=fill"  # the film beside it dimmed (it rebuilds meanwhile)
WORKING = f"{AGENT},{SPOT}"
# From the assistant beside the film (1280 wide at 0,0) to the film alone (1100 wide at 432,75): hold 0.9 s, push in
# over 0.9 s with an ease. It ends a little inside the film (INSET), so no edge of the app around it shows. The take is
# doubled first so the moving crop is steady.
E = "(st(0,clip((in/30-0.9)/0.9,0,1))*0+ld(0)*ld(0)*(3-2*ld(0)))"
FILM_X, FILM_Y, FILM_W, INSET = 432, 75, 1100, 1.025
end_w = FILM_W / INSET
end_x, end_y = FILM_X + (FILM_W - end_w) / 2, FILM_Y + (FILM_W - end_w) * 9 / 32
PUSH = (f"scale=3840:2160:flags=lanczos,zoompan=z='1.5+{1920 / end_w - 1.5:.4f}*{E}'"
        f":x='{2 * end_x:.1f}*{E}':y='{2 * end_y:.1f}*{E}':d=1:s=1440x810:fps=30")

DROP_AT = 29.5     # where in the film the music's drop falls: the new version
TRACK_DROP = 88.5  # the drop in the track (its second; the first is at 29.5 s)
END_HOLD = 4.2     # the closing card, held

# Each chapter: its caption in English and in Chinese, and an optional second line. Straight apostrophes: the CJK
# face sets a curly one full width.
CHAPTERS = [
    ("Describe it in a sentence.", "说一句话，就有一部片子", None, None),
    ("Pick a look. No design skills needed.", "挑个风格，不会设计也好看", None, None),
    ("Circle what's wrong.", "哪里不对，圈出来", None, None),
    ("Say what to change.", "说一句要怎么改", None, None),
    ("Works with the AI you already have.", "用你自己的 AI 来改",
     "Claude Code · Codex · any model's API key", "Claude Code · Codex · 或任意模型的 API Key"),
    ("Only that part changes.", "只改那一处，其余不动", None, None),
    ("Give it a voice.", "配上旁白", None, None),
    ("Export an MP4. It stays on your computer.", "导出 MP4，文件只在你电脑上", None, None),
]
CLOSING = ("Free · Open source · No account", "免费 · 开源 · 不用注册")

# (start, end, speed or ("len", seconds), filter, crossfade into it, chapter it opens or None)
def shots_for(work_len):
    s = [
        (m["brief"] - 0.4, m["brief-sent"] + 0.8, ("len", 3.4), HOME, 0, 0),         # the sentence, typed
        (m["editor"] + 1.0, m["made"] - 0.2, ("len", 1.4), WORKING, 0, None),       # the agent makes the first cut
        (m["play-v1"] + 0.3, m["play-v1"] + 2.1, 1.0, STAGE, 0, None),              # and it plays
        (m["motions"] - 0.2, m["look-open"] + 1.6, ("len", 2.4), None, 0, 1),       # the motions, one opened
        (m["look-sent"] + 1.0, m["look-done"] - 0.2, ("len", 1.0), WORKING, 0, None),
        (m["play-look"] + 0.3, m["play-look"] + 2.3, 1.0, STAGE, 0, None),          # the film in its new look
        (m["drag"] - 0.3, m["drag"] + 2.6, 1.0, STAGE, 0, 2),                       # the bars are marked
        (m["note"] - 0.15, m["note"] + 5.55, 1.6, STAGE, 0, 3),                     # the note
        (m["note"] + 5.55, m["sent"] + 1.6, 2.0, LEFT_BOTTOM, 0, None),             # sent to the agent
        (m["sent"] + 1.6, m["agent-done"] - 0.2, ("len", work_len), WORKING, 0, 4), # the agent at work
        (m["play-v2"] + 1.06, m["play-v2"] + 5.0, 1.0, PUSH, 0.6, 5),               # the bars rise, push in: the drop
    ]
    if "voice" in m:
        voiced_from = m.get("voice-sent", m["voice"] + 1.2)
        s += [
            (m["voice"] - 0.2, voiced_from + 0.8, ("len", 2.0), None, 0, 6),         # the voice view
            (voiced_from + 0.8, m["voiced"] + 1.2, ("len", 1.4), None, 0, None),     # the lines spoken, one by one
            (m["play-voice"] + 0.3, m["play-voice"] + 4.7, 1.0, STAGE, 0, None),     # its first line heard whole (from the export)
        ]
    s += [
        (m["export-open"] - 0.2, m["export-start"] + 0.6, ("len", 2.0), DIALOG, 0, 7),
        (m["export-start"] + 0.6, m["export-done"] + 2.4, ("len", 2.6), None, 0, None),
    ]
    return s


def length(shot):
    a, b, sp = shot[0], shot[1], shot[2]
    return sp[1] if isinstance(sp, tuple) else (b - a) / sp


CARD_OPEN = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", os.path.join(here, "card-open.mp4")]))
CARD_CLOSE = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", os.path.join(here, "card-close.mp4")]))

# The agent's turn takes whatever length puts the drop where it belongs. The drop falls where the push has faded
# fully in, which is where the turn ends: the turn starts after the card and the nine shots before it (all cuts).
work_len = max(2.0, DROP_AT - CARD_OPEN - sum(length(x) for x in shots_for(1.0)[:9]))
shots = shots_for(work_len)

# Render each shot.
files, lens = [os.path.join(here, "card-open.mp4")], [CARD_OPEN]
for i, (a, b, sp, vf, _, _) in enumerate(shots):
    speed = (b - a) / sp[1] if isinstance(sp, tuple) else sp
    seek = max(0.0, a - 1)
    # Cut the take's seconds first (trim), then speed them up: a duration given to ffmpeg would bound the output.
    chain = [f"trim=start={a - seek:.3f}:end={b - seek:.3f}", f"setpts=(PTS-STARTPTS)/{speed:.4f}"] + ([vf] if vf else [])
    # zoompan already gives 30 fps; fps after it reads its timestamps as a gap and fills it with copies.
    chain += ["scale=1440:810:flags=lanczos", "setsar=1"] + ([] if vf == PUSH else [f"fps={FPS}"]) + ["format=yuv420p"]
    name = f"shot{i}.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{seek:.3f}", "-t", f"{b - seek + 0.2:.3f}", "-i", "raw.mp4", "-vf", ",".join(chain),
                    "-an", "-c:v", "libx264", "-preset", "fast", "-crf", "14", name], check=True)
    files.append(name)
    lens.append((b - a) / speed)
files.append(os.path.join(here, "card-close.mp4"))
lens.append(max(END_HOLD, CARD_CLOSE))
fades = [0] + [x[4] for x in shots] + [0.5]
chapters_at = [None] + [x[5] for x in shots] + [None]

# Join them; the closing card is held at the join (held right after zoompan, ffmpeg repeats it far too long).
last = len(files) - 1
graph = [f"[{i}:v]settb=1/{FPS},setpts=PTS-STARTPTS,scale=1440:810,setsar=1,fps={FPS},format=yuv420p"
         + (f",tpad=stop_mode=clone:stop_duration={END_HOLD - CARD_CLOSE:.3f}" if i == last and END_HOLD > CARD_CLOSE else "")
         + f"[v{i}]" for i in range(len(files))]
acc, total, starts = "v0", lens[0], [0.0]
for i in range(1, len(files)):
    begin = total - fades[i]
    if fades[i]:
        graph.append(f"[{acc}][v{i}]xfade=transition=fade:duration={fades[i]}:offset={begin:.3f}[j{i}]")
    else:
        graph.append(f"[{acc}][v{i}]concat=n=2:v=1:a=0,settb=1/{FPS}[j{i}]")
    starts.append(begin)
    total, acc = begin + lens[i], f"j{i}"
graph.append(f"[{acc}]format=yuv420p[out]")
inputs = sum((["-i", f] for f in files), [])
subprocess.run(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", ";".join(graph), "-map", "[out]", "-c:v", "libx264",
                "-preset", "slow", "-crf", "14", "-an", "picture.mp4"], check=True)

# Where each chapter starts and ends, and where the drop fell.
opens = [(starts[i], chapters_at[i]) for i in range(len(files)) if chapters_at[i] is not None]
chapter_times = []
for k, (at, ch) in enumerate(opens):
    until = opens[k + 1][0] if k + 1 < len(opens) else starts[last]
    chapter_times.append((ch, at, until))
drop_index = next(i for i in range(len(files)) if chapters_at[i] == 5)
drop = starts[drop_index] + fades[drop_index]
closing_at = starts[last]

# The sound: the music from the track's second build, its drop on the new version; under the voice chapter the
# narration from the take's own export, the music lowered beneath it; faded out over the closing card.
offset = TRACK_DROP - drop
voice = None
has_sound = os.path.exists("export.mp4") and subprocess.check_output(
    ["ffprobe", "-v", "error", "-select_streams", "a", "-show_entries", "stream=index", "-of", "csv=p=0", "export.mp4"]).strip()
if "play-voice" in m and has_sound:
    i = 1 + next(k for k, x in enumerate(shots) if x[0] == m["play-voice"] + 0.3)  # files[0] is the opening card
    voice = (starts[i], starts[i] + lens[i], 0.3)  # in the film, from, to; the export's time it starts from
fade_out = 2.2
music_chain = (f"[0:a]atrim=start={offset:.3f}:duration={total:.3f},asetpts=PTS-STARTPTS,afade=t=in:d=0.15,"
               f"afade=t=out:st={total - fade_out:.3f}:d={fade_out}")
if voice:
    a, b, _ = voice
    duck = f"1-0.68*clip((t-{a - 0.35:.3f})/0.35,0,1)*clip(({b + 0.35:.3f}-t)/0.35,0,1)"
    music_chain += f",volume='{duck}':eval=frame"
music_chain += "[music]"
audio_graph = [music_chain]
audio_inputs = ["-i", music]
if voice:
    a, b, from_ = voice
    audio_inputs += ["-i", "export.mp4"]
    audio_graph.append(f"[1:a]atrim=start={from_:.3f}:duration={b - a:.3f},asetpts=PTS-STARTPTS,afade=t=out:st={b - a - 0.3:.3f}:d=0.3,"
                       f"adelay={int(a * 1000)}|{int(a * 1000)},apad=whole_dur={total:.3f}[voice]")
    audio_graph.append("[music][voice]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.95[a]")
else:
    audio_graph.append("[music]anull[a]")
subprocess.run(["ffmpeg", "-v", "error", "-y", *audio_inputs, "-filter_complex", ";".join(audio_graph), "-map", "[a]",
                "-ar", "48000", "-c:a", "pcm_s16le", "sound.wav"], check=True)


def ass_time(t):
    t = max(0.0, t)
    return f"{int(t // 3600)}:{int(t % 3600 // 60):02d}:{t % 60:05.2f}"


def ass_text(s):
    return s.replace("{", "(").replace("}", ")")


# The captions: bottom left, the chapter's number in vermilion, on a dark band so they read over paper and over the app.
def captions(lang):
    head = """[Script Info]
ScriptType: v4.00+
PlayResX: 1440
PlayResY: 810
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,Noto Sans CJK SC,40,&H00F7F4F0,&H00F7F4F0,&H1E121417,&H00000000,1,0,0,0,100,100,0,0,3,16,0,1,64,64,62,1
Style: End,Noto Sans CJK SC,25,&H005B636B,&H005B636B,&H00000000,&H00000000,0,0,0,0,100,100,1,0,1,0,0,5,0,0,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    lines = []
    for ch, a, b in chapter_times:
        en, zh, en2, zh2 = CHAPTERS[ch]
        text = ass_text(en if lang == "en" else zh)
        second = en2 if lang == "en" else zh2
        body = (r"{\fad(180,160)\move(64,758,64,748,0,240)\an1}" + r"{\c&H4D6AFF&}" + f"{ch + 1:02d}" +
                r"{\c&HF0F4F7&}  " + text)  # one size on the line, so its band is one height
        if second:
            body += r"\N{\fs24\c&HB8BEC4&\b0}" + ass_text(second)
        lines.append(f"Dialogue: 0,{ass_time(a + 0.12)},{ass_time(b - 0.12)},Cap,,0,0,0,,{body}")
    closing = CLOSING[0] if lang == "en" else CLOSING[1]
    lines.append(f"Dialogue: 0,{ass_time(closing_at + 1.1)},{ass_time(total)},End,,0,0,0,,"
                 + r"{\fad(400,0)\pos(720,560)}" + closing)
    return head + "\n".join(lines) + "\n"


os.makedirs(out_dir, exist_ok=True)
for lang in ("en", "zh"):
    with open(f"captions.{lang}.ass", "w", encoding="utf-8") as f:
        f.write(captions(lang))
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", "picture.mp4", "-i", "sound.wav", "-vf", f"ass=captions.{lang}.ass",
                    "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-preset", "slow", "-crf", "24", "-profile:v", "high",
                    "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-shortest", "-movflags", "+faststart",
                    os.path.join(out_dir, f"studio-loop.{lang}.mp4")], check=True)

summary = {"length": round(total, 2), "drop": round(drop, 2), "music_from": round(offset, 2),
           "chapters": [{"n": ch + 1, "at": round(a, 2), "en": CHAPTERS[ch][0], "zh": CHAPTERS[ch][1]} for ch, a, _ in chapter_times]}
with open(os.path.join(out_dir, "chapters.json"), "w", encoding="utf-8") as f:
    json.dump(summary, f, ensure_ascii=False, indent=1)
print(f"total {total:.2f}s · drop at {drop:.2f}s · music from {offset:.2f}s of the track")
for c in summary["chapters"]:
    print(f"  {c['n']:02d} at {c['at']:.2f}  {c['en']}")
