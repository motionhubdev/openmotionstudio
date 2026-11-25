"""Cut the website's hero film (media/studio-loop.<lang>.mp4 on openmotion.studio) from a take of shoot.sh.
Usage: cut.py RUN_DIR MUSIC [OUT_DIR]

MUSIC is Cat Walk by Arulo (Mixkit free licence: https://mixkit.co/free-stock-music/ , track 371), not kept here.

Between the opening and closing cards (card-open.mp4, card-close.mp4 beside this file), each frame is a page: on the
left what the chapter is (its number, a heading and a sentence), on the right the Studio in a window. The film opens
on the whole Studio, saying where things are; each chapter then starts on the whole window and moves in on the part
being used. Times come from the take's marks.json, so a new take cuts the same way. The words are burned in once per
language; the chapters' start times are printed and written to chapters.json for the website's steps.

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

# The page: 1440x810 paper, the window on the right with a soft shadow under it, the words in the column to its left.
PAPER = "0xF3F0EA"
WIN_X, WIN_Y, WIN_W, WIN_H, RADIUS = 536, 162, 864, 486, 14
TEXT_LEFT, TEXT_RIGHT = 72, 488

# Parts of the 1920x1080 take, as rectangles (x, y, w, h), all 16:9.
FULL = (0, 0, 1920, 1080)
HOME = (310, 150, 1500, 844)          # the brief at Home
STAGE = (390, 52, 1184, 666)          # the film and its controls
FILM = (432, 75, 1100, 619)           # the film alone
COMPOSER = (0, 360, 1280, 720)        # the composer and the timeline
DIALOG = (192, 108, 1536, 864)        # a dialog in the middle
AGENT = (0, 540, 864, 486)            # the foot of the assistant: the message, its steps, the composer
LIBRARY = (420, 60, 1500, 844)        # the motions and the one opened
HOLD, MOVE = 0.35, 0.75               # a chapter's first shot: the whole window held, then the move in

DROP_AT = 29.5     # where in the film the music's drop falls: the new version
TRACK_DROP = 88.5  # the drop in the track (its second; the first is at 29.5 s)
END_HOLD = 4.2     # the closing card, held

# The opening, then each chapter: its label, heading and sentence, in English and in Chinese. Chinese lines are broken
# by hand (\N); English ones wrap in the column.
INTRO = ("OpenMotionStudio", "One window for the whole film.",
         "Your AI on the left, the picture in the middle, the timeline below.",
         "OpenMotionStudio", r"一个窗口，做完整部片子",
         r"左边和 AI 对话，中间是画面，\N下面是时间线。")
CHAPTERS = [
    ("Describe it", "Describe it in a sentence.", "Say what the film is about; your AI writes it and animates it.",
     "一句话生成", r"说一句话，\N就有一部片子", r"写下你想要的画面，\NAI 写好代码、做成动画。"),
    ("Pick a look", "No design skills needed.", "Apply a look from motionhub: its colours, type and parts, in one turn.",
     "挑一个风格", r"不会设计，\N也能好看", r"从 motionhub 选一个风格，\N配色、字体和部件一次换好。"),
    ("Circle it", "Circle what's wrong.", "Mark the spot on the picture, at the very frame.",
     "圈出来", r"哪里不对，\N圈出来", r"在画面上框出那一处，\N精确到那一帧。"),
    ("Say it", "Say what to change.", "A note on the mark, sent to your AI with the next message.",
     "说要改什么", r"说一句\N要怎么改", r"在标记上写一句要求，\N随消息发给 AI。"),
    ("Your own AI", "Works with the AI you already have.", "Claude Code, Codex, or any model's API key. No account.",
     "你自己的 AI", r"用你自己的 AI", r"Claude Code、Codex，\N或任意模型的 API Key，不用注册。"),
    ("Precise edits", "Only that part changes.", "The tallest bar turns red and the bars rise in turn; the rest stays.",
     "精确修改", r"只改那一处，\N其余不动", r"最高的柱子变红，柱子依次升起，\N其余原样不动。"),
    ("Voice", "Give it a voice.", "Your AI writes the lines; your voice provider speaks them.",
     "配音", r"配上旁白", r"AI 写好台词，\N用你的语音服务读出来。"),
    ("Export", "Export an MP4.", "Rendered on your computer, and it stays there.",
     "导出", r"导出 MP4", r"在你电脑上渲染，\N文件也只留在你电脑上。"),
]
CLOSING = ("Free · Open source · No account", "免费 · 开源 · 不用注册")


# Each shot: (start, end, speed or ("len", seconds), rectangle, crossfade into it, chapter it opens or None, -1 the
# opening). A shot that opens a chapter starts on the whole window and moves in on its rectangle.
def shots_for(work_len):
    s = [
        (m["play-v2"] + 4.6, m["play-v2"] + 8.1, 1.0, FULL, 0.45, -1),             # the whole Studio, the film playing
        (m["brief"] - 0.4, m["brief-sent"] + 0.8, ("len", 3.2), HOME, 0, 0),         # the sentence, typed
        (m["editor"] + 1.0, m["made"] - 0.2, ("len", 1.1), AGENT, 0, None),         # the agent makes the first cut
        (m["play-v1"] + 0.3, m["play-v1"] + 2.1, 1.0, STAGE, 0, None),              # and it plays
        (m["motions"] - 0.2, m["look-open"] + 1.6, ("len", 2.4), LIBRARY, 0, 1),    # the motions, one opened
        (m["look-sent"] + 1.0, m["look-done"] - 0.2, ("len", 0.9), AGENT, 0, None),
        (m["play-look"] + 0.3, m["play-look"] + 2.3, 1.0, STAGE, 0, None),          # the film in its new look
        (m["drag"] - 0.3, m["drag"] + 2.6, 1.0, STAGE, 0, 2),                       # the bars are marked
        (m["note"] - 0.15, m["note"] + 5.55, 1.8, STAGE, 0, 3),                     # the note
        (m["note"] + 5.55, m["sent"] + 1.6, 2.2, COMPOSER, 0, None),                # sent to the agent
        (m["sent"] + 1.6, m["agent-done"] - 0.2, ("len", work_len), AGENT, 0, 4),   # the agent at work
        (m["play-v2"] + 1.06, m["play-v2"] + 5.0, 1.0, FILM, 0.5, 5),               # the bars rise: the drop
    ]
    if "voice" in m:
        voiced_from = m.get("voice-sent", m["voice"] + 1.2)
        s += [
            (m["voice"] - 0.2, voiced_from + 0.8, ("len", 2.0), FULL, 0, 6),         # the voice view
            (voiced_from + 0.8, m["voiced"] + 1.2, ("len", 1.2), FULL, 0, None),     # the lines spoken, one by one
            (m["play-voice"] + 0.3, m["play-voice"] + 4.7, 1.0, FILM, 0, None),      # its first line heard (from the export)
        ]
    s += [
        (m["export-open"] - 0.2, m["export-start"] + 0.6, ("len", 2.0), DIALOG, 0, 7),
        (m["export-start"] + 0.6, m["export-done"] + 2.4, ("len", 2.4), FULL, 0, None),
    ]
    return s


def length(shot):
    a, b, sp = shot[0], shot[1], shot[2]
    return sp[1] if isinstance(sp, tuple) else (b - a) / sp


def duration(path):
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path]))


CARD_OPEN, CARD_CLOSE = duration(os.path.join(here, "card-open.mp4")), duration(os.path.join(here, "card-close.mp4"))

# The agent's turn takes whatever length puts the drop where it belongs: where the move to the film has faded fully in,
# which is where the turn ends.
trial = shots_for(1.0)
work_at = next(i for i, x in enumerate(trial) if x[5] == 4)
before = CARD_OPEN + sum(length(x) - x[4] for x in trial[:work_at])
work_len = max(2.0, DROP_AT - before)
shots = shots_for(work_len)

# The page behind every shot, and the window's rounded corners.
subprocess.run(["ffmpeg", "-v", "error", "-y", "-filter_complex",
                f"color=c={PAPER}:s=1440x810,format=rgba[p];"
                f"color=c=black@0:s=1440x810,format=rgba,drawbox=x={WIN_X + 6}:y={WIN_Y + 16}:w={WIN_W - 12}:h={WIN_H - 6}:color=black@0.30:t=fill,"
                f"boxblur=26:3[s];[p][s]overlay,format=rgb24",
                "-frames:v", "1", "page.png"], check=True)
corner = (f"255*lte(hypot(max(0,max({RADIUS}-X,X-(W-1-{RADIUS}))),max(0,max({RADIUS}-Y,Y-(H-1-{RADIUS})))),{RADIUS})")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", f"color=c=black:s={WIN_W}x{WIN_H}", "-vf",
                f"format=gray,geq=lum='{corner}'", "-frames:v", "1", "corners.png"], check=True)


def framing(rect, opens):
    """zoompan over the take doubled (steadier): the rectangle, or from the whole window to it when the shot opens a
    chapter."""
    x, y, w, h = rect
    if opens and rect != FULL:
        e = f"(st(0,clip((in/{FPS}-{HOLD})/{MOVE},0,1))*0+ld(0)*ld(0)*(3-2*ld(0)))"
        rw, rx, ry = f"(1920+({w}-1920)*{e})", f"({x}*{e})", f"({y}*{e})"
    else:
        rw, rx, ry = str(w), str(x), str(y)
    return (f"scale=3840:2160:flags=lanczos,zoompan=z='1920/{rw}':x='2*{rx}':y='2*{ry}':d=1"
            f":s={WIN_W}x{WIN_H}:fps={FPS}")


# Render each shot as a page.
files, lens = [os.path.join(here, "card-open.mp4")], [CARD_OPEN]
for i, (a, b, sp, rect, _, ch) in enumerate(shots):
    speed = (b - a) / sp[1] if isinstance(sp, tuple) else sp
    seek = max(0.0, a - 1)
    # Cut the take's seconds first (trim), speed them up, and keep 30 frames a second: zoompan makes one of each.
    footage = (f"[0:v]trim=start={a - seek:.3f}:end={b - seek:.3f},setpts=(PTS-STARTPTS)/{speed:.4f},fps={FPS},"
               f"{framing(rect, ch is not None)},format=rgba[f];[2:v]format=gray[c];[f][c]alphamerge[w];"
               f"[1:v][w]overlay={WIN_X}:{WIN_Y}:shortest=1,setsar=1,format=yuv420p")
    name = f"shot{i}.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{seek:.3f}", "-t", f"{b - seek + 0.2:.3f}", "-i", "raw.mp4",
                    "-loop", "1", "-i", "page.png", "-loop", "1", "-i", "corners.png", "-filter_complex", footage,
                    # The page and corners loop for ever (alphamerge repeats them), so the shot's length ends it.
                    "-t", f"{(b - a) / speed:.3f}",
                    "-an", "-c:v", "libx264", "-preset", "fast", "-crf", "14", name], check=True)
    files.append(name)
    lens.append((b - a) / speed)
files.append(os.path.join(here, "card-close.mp4"))
lens.append(max(END_HOLD, CARD_CLOSE))
fades = [0] + [x[4] for x in shots] + [0.5]
chapters_at = [None] + [x[5] for x in shots] + [None]

# Join them; the closing card is held at the join.
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

# Where the opening and each chapter start and end, and where the drop fell.
opens = [(starts[i], chapters_at[i]) for i in range(len(files)) if chapters_at[i] is not None]
sections = []
for k, (at, ch) in enumerate(opens):
    until = opens[k + 1][0] if k + 1 < len(opens) else starts[last]
    sections.append((ch, at, until))
chapter_times = [x for x in sections if x[0] >= 0]
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


# The words, in the column left of the window, centred on it: the label in vermilion, the heading in ink, the sentence
# in grey. Straight apostrophes: the CJK face sets a curly one full width.
def words(lang):
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1440
PlayResY: 810
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Col,Noto Sans CJK SC,48,&H00161B1F,&H00161B1F,&H00000000,&H00000000,1,0,0,0,100,100,0,0,1,0,0,4,{TEXT_LEFT},{1440 - TEXT_RIGHT},0,1
Style: End,Noto Sans CJK SC,25,&H005B636B,&H005B636B,&H00000000,&H00000000,0,0,0,0,100,100,1,0,1,0,0,5,0,0,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    lines = []
    total_chapters = len(CHAPTERS)
    for ch, a, b in sections:
        if ch < 0:
            label_en, title_en, line_en, label_zh, title_zh, line_zh = INTRO
            number = ""
        else:
            label_en, title_en, line_en, label_zh, title_zh, line_zh = CHAPTERS[ch]
            number = f"{ch + 1:02d} / {total_chapters:02d}   "
        label, title, line = (label_en, title_en, line_en) if lang == "en" else (label_zh, title_zh, line_zh)
        body = (r"{\fad(260,200)}" + r"{\fs19\b1\fsp1\c&H1F38C4&}" + number + ass_text(label.upper() if lang == "en" else label)
                + r"\N{\fs14} \N{\fs46\b1\fsp0\c&H161B1F&}" + ass_text(title)
                + r"\N{\fs16} \N{\fs22\b0\c&H5B636B&}" + ass_text(line))
        lines.append(f"Dialogue: 0,{ass_time(a + 0.1)},{ass_time(b - 0.05)},Col,,0,0,0,,{body}")
    closing = CLOSING[0] if lang == "en" else CLOSING[1]
    lines.append(f"Dialogue: 0,{ass_time(closing_at + 1.1)},{ass_time(total)},End,,0,0,0,,"
                 + r"{\fad(400,0)\pos(720,560)}" + closing)
    return head + "\n".join(lines) + "\n"


os.makedirs(out_dir, exist_ok=True)
for lang in ("en", "zh"):
    with open(f"words.{lang}.ass", "w", encoding="utf-8") as f:
        f.write(words(lang))
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", "picture.mp4", "-i", "sound.wav", "-vf", f"ass=words.{lang}.ass",
                    "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-preset", "slow", "-crf", "24", "-profile:v", "high",
                    "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-shortest", "-movflags", "+faststart",
                    os.path.join(out_dir, f"studio-loop.{lang}.mp4")], check=True)

summary = {"length": round(total, 2), "drop": round(drop, 2), "music_from": round(offset, 2),
           "chapters": [{"n": ch + 1, "at": round(a, 2), "en": CHAPTERS[ch][0], "zh": CHAPTERS[ch][3]} for ch, a, _ in chapter_times]}
with open(os.path.join(out_dir, "chapters.json"), "w", encoding="utf-8") as f:
    json.dump(summary, f, ensure_ascii=False, indent=1)
print(f"total {total:.2f}s · drop at {drop:.2f}s · music from {offset:.2f}s of the track")
for c in summary["chapters"]:
    print(f"  {c['n']:02d} at {c['at']:.2f}  {c['en']}")
