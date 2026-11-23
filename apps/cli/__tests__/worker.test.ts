import { describe, expect, it } from 'vitest';
import { recordingReport, renderStages, voiceSetup } from '../worker';

describe('renderStages', () => {
  it('draws with a Chrome a core, as memory allows, and at most eight', () => {
    expect(renderStages(4, 16e9)).toBe(4);
    expect(renderStages(16, 64e9)).toBe(8);
    expect(renderStages(8, 4e9)).toBe(2);
  });

  it('always draws with one, however little there is', () => {
    expect(renderStages(1, 0.5e9)).toBe(1);
    expect(renderStages(0, 0)).toBe(1);
  });
});

describe('voiceSetup', () => {
  it("reads a provider's key and settings from the environment only", () => {
    expect(voiceSetup('minimax', { MINIMAX_API_KEY: ' k ' })).toEqual({ kind: 'minimax', key: 'k', groupId: undefined, region: 'global', model: undefined });
    expect(voiceSetup('minimax', { MINIMAX_API_KEY: 'k', MINIMAX_REGION: 'china', MINIMAX_GROUP_ID: 'g', MINIMAX_TTS_MODEL: 'speech-02-hd' }))
      .toEqual({ kind: 'minimax', key: 'k', groupId: 'g', region: 'china', model: 'speech-02-hd' });
    // VisoTalk's variable: an account on minimaxi.com is China's site.
    expect(voiceSetup('minimax', { MINIMAX_API_KEY: 'k', MINIMAX_BASE_URL: 'https://api.minimaxi.com' }).region).toBe('china');
    expect(voiceSetup('minimax', { MINIMAX_API_KEY: 'k', MINIMAX_BASE_URL: 'https://api.minimax.io' }).region).toBe('global');
    expect(voiceSetup('openai', { OPENAI_API_KEY: 'k', OPENAI_TTS_MODEL: 'tts-1' })).toEqual({ kind: 'openai', key: 'k', model: 'tts-1' });
    expect(voiceSetup('azure', { AZURE_SPEECH_KEY: 'k', AZURE_SPEECH_REGION: 'eastasia' })).toEqual({ kind: 'azure', key: 'k', region: 'eastasia' });
  });

  it('says which variable a missing key goes in, and never the key it has', () => {
    expect(() => voiceSetup('minimax', {})).toThrow(/MiniMax speaks with the key in MINIMAX_API_KEY/);
    expect(() => voiceSetup('elevenlabs', { ELEVENLABS_API_KEY: '  ' })).toThrow(/ELEVENLABS_API_KEY/);
    let said = '';
    try {
      voiceSetup('azure', { AZURE_SPEECH_KEY: 'secret-value' });
    } catch (error) {
      said = (error as Error).message;
    }
    expect(said).toMatch(/AZURE_SPEECH_REGION/);
    expect(said).not.toContain('secret-value');
  });
});

describe('recordingReport', () => {
  const done = { lines: 2, seconds: 7.25, heard: 0.97, transcriber: 'minimax' as const, cached: false, changed: [], asides: [] };

  it('names who transcribed, and whether the kept transcript was used', () => {
    expect(recordingReport(done, 'take.m4a')).toEqual([
      'Transcribed by MiniMax.',
      'Cut 2 lines (7.3 s of speech) from take.m4a into voice/, 97% of the script heard as written.',
      'Run oms check: each line now lasts as long as it was said.',
    ]);
    expect(recordingReport({ ...done, cached: true }, 'take.m4a')[0]).toBe('Used the transcript kept from an earlier import of this take (by MiniMax): nothing was paid.');
  });

  it('lists every line read otherwise and every word said between lines', () => {
    const report = recordingReport({
      ...done,
      changed: [{ id: 'race', changes: [{ written: '一瞬间', heard: '一眨眼' }, { written: '', heard: '嗯' }, { written: '了', heard: '' }] }],
      asides: [{ text: '嗯', at: 27.62 }],
    }, 'take.m4a');
    expect(report).toContain('- race: "一瞬间" heard as "一眨眼"; added "嗯"; "了" not heard');
    expect(report).toContain('Said between the lines, and in no clip: "嗯" at 27.6 s.');
    expect(report.join('\n')).toMatch(/caption shows the written words[\s\S]*write the line as it was said and run this again/);
  });
});
