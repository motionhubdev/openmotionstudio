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
  {head: {en: 'Pick a *look* from motionhub.', zh: '从 motionhub|挑一个*风格*'}},
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

/** The AIs the Studio works with, shown in chapter 4. */
export const AIS = {en: ['Claude Code', 'Codex', 'Any API key'], zh: ['Claude Code', 'Codex', '任意模型 API Key']};

export const CLOSING = {en: 'Free · Open source · No account', zh: '免费 · 开源 · 不用注册'};
