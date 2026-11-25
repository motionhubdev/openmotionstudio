// What the film says, in English and in Chinese. A headline marks its key words with *stars*: they are set in
// vermilion. A Chinese headline breaks where `|` is.

export type Lang = 'en' | 'zh';
export interface Card {
  head: {en: string; zh: string};
}

export const INTRO: Card = {head: {en: 'One window for the *whole film*.', zh: '一个窗口，|做完*整部片子*'}};

/** The three parts of the window, named as the intro lands. */
export const TAGS = {en: ['Your AI', 'The picture', 'The timeline'], zh: ['和 AI 对话', '画面', '时间线']};

export const CHAPTERS: Card[] = [
  {head: {en: 'Describe it in *one sentence*.', zh: '说*一句话*，|就有一部片子'}},
  {head: {en: 'Pick a *look*. No design skills.', zh: '挑个*风格*，|不会设计也好看'}},
  {head: {en: 'Something off? *Circle it.*', zh: '哪里不对，|*圈出来*'}},
  {head: {en: 'Then *say* what to change.', zh: '再*说一句*|要怎么改'}},
  {head: {en: 'Works with *your own AI*.', zh: '用*你自己的 AI*'}},
  {head: {en: 'Only *that part* changes.', zh: '只改*那一处*'}},
  {head: {en: 'Give it a *voice*.', zh: '配上*旁白*'}},
  {head: {en: 'Export an *MP4*.', zh: '导出 *MP4*'}},
];

/** The AIs the Studio works with, shown in chapter 5. */
export const AIS = {en: ['Claude Code', 'Codex', 'Any API key'], zh: ['Claude Code', 'Codex', '任意模型 API Key']};

export const CLOSING = {en: 'Free · Open source · No account', zh: '免费 · 开源 · 不用注册'};
