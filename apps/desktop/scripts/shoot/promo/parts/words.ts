// What the film says, in English and in Chinese. A headline marks its key words with *stars*: they are set in
// vermilion. A Chinese headline breaks where `|` is.

export type Lang = 'en' | 'zh';
export interface Card {
  head: {en: string; zh: string};
}

export const INTRO: Card = {head: {en: 'One window for the *whole film*.', zh: '一个窗口，|做完*整部片子*'}};

/** The four parts of the window, named as the intro lands. */
export const TAGS = {en: ['Your AI', 'The picture', 'The timeline', 'The outline'], zh: ['和 AI 对话', '画面', '时间线', '大纲']};

export const CHAPTERS: Card[] = [
  {head: {en: 'Describe it in *one sentence*.', zh: '说*一句话*，|就有一部片子'}},
  {head: {en: 'Or borrow a *look* from motionhub.', zh: '也可以套用|motionhub 的*风格*'}},
  {head: {en: '*Circle it*, say what to change.', zh: '*圈出来*，|说一句怎么改'}},
  {head: {en: 'Works with *your own AI*.', zh: '用*你自己的 AI*'}},
  {head: {en: 'Give it a *voice*.', zh: '配上*旁白*'}},
  {head: {en: 'Export an *MP4*.', zh: '导出 *MP4*'}},
];

/** Some of motionhub's motions, each in a colour of its own, for chapter 2's card. */
export const MOTIONS: [string, string, string][] = [
  ['Night Diagram', '#0e1a3a', '#7fd6ff'],
  ['Clay World', '#f0c9a8', '#7a3e1d'],
  ['Stage Light', '#111111', '#f5e6b8'],
  ['Plumb Line', '#dfe8f2', '#1d3f6e'],
  ['Lab Notebook', '#f7f6ef', '#c0392b'],
  ['Riso Pop', '#f4efe6', '#e8488a'],
  ['Idea Map', '#e8eef4', '#2b59c3'],
  ['Iso Works', '#eceae3', '#3a7d5c'],
];

/** The AIs the Studio works with, shown in chapter 4, in the order its agent menu lists them. */
export const AIS = ['Codex', 'Claude Code', 'Gemini', 'DeepSeek'];

/** Chapter 1: the sentence typed and sent, and the agent at work on it. */
export const PROMPT = {en: 'A 15-second explainer: why the Moon has phases.', zh: '15 秒讲解片：月亮为什么有阴晴圆缺？'};
export const MAKING = {en: 'Claude Code is making it', zh: 'Claude Code 正在制作'};
/** Its steps, and what they made: the film's lines (in English, the film's own language) and its check. */
export const STEPS = [{en: 'Writes the script', zh: '写好脚本'}, {en: 'Builds 3 scenes', zh: '搭出 3 个场景'}, {en: 'Checks every frame', zh: '逐帧检查'}];
export const SCRIPT = ['Sunlight always lights exactly half of the Moon.', 'As the Moon circles Earth, its lit half keeps facing the Sun.', 'From Earth, we see more or less of that lit half.'];
export const CHECKED = {en: ['11 frames · no problems', '15 s · 1920 × 1080'], zh: ['11 帧 · 没有问题', '15 秒 · 1920 × 1080']};

/** Chapter 3: the note written beside the circled dark half. */
export const NOTE = {en: 'The Moon looks flat. Give it a real surface: craters and relief.', zh: '月亮看起来太平了，给它加上真实的表面：陨石坑和起伏。'};
/** Chapter 4: the agent menu's rows, in its order, and the models of the one chosen. */
export const AGENT_ROWS: [string, {en: string; zh: string}][] = [
  ['Codex', {en: 'OpenAI · your sign-in', zh: 'OpenAI · 你自己的账号'}],
  ['Claude Code', {en: 'Anthropic · your sign-in', zh: 'Anthropic · 你自己的账号'}],
  ['Gemini', {en: 'Google · your key', zh: 'Google · 你自己的 key'}],
  ['DeepSeek', {en: 'DeepSeek · your key', zh: 'DeepSeek · 你自己的 key'}],
];
export const MODELS = ['Fable 5.2', 'Opus 5.5', 'Sonnet 5.5', 'Haiku 5.5'];
/** Chapter 5: voices to choose from (MiniMax's, the ones the film is dubbed in), the first chosen. */
export const VOICES: [string, {en: string; zh: string}][] = [
  ['Trustworthy Man', {en: 'English · warm, steady', zh: '英文 · 温暖、沉稳'}],
  ['Reliable Executive', {en: 'Chinese · calm, assured', zh: '中文 · 沉着、可靠'}],
  ['Intellectual Senior', {en: 'Japanese · wise, measured', zh: '日文 · 睿智、从容'}],
  ['Calm Lady', {en: 'Korean · calm, gentle', zh: '韩文 · 平静、温柔'}],
];
/** Chapter 6: the film, exported. */
export const EXPORT_FILE = {name: 'why-the-moon-has-phases.mp4', meta: {en: '1920 × 1080 · 16 s · with its voice', zh: '1920 × 1080 · 16 秒 · 带旁白'}};

export const CLOSING = {en: 'Free · Open source · No account', zh: '免费 · 开源 · 不用注册'};
