import { describe, expect, it } from 'vitest';
import { getModelSupport, pickBestModel } from '../../main/models.js';

describe('model support policy', () => {
  it('limits to base on low-end CPU', () => {
    const support = getModelSupport({
      ramGB: 4,
      logicalCores: 4,
      gpu: { backend: 'cpu', vramGB: 0 },
    });
    expect(support.base.supported).toBe(true);
    expect(support.small.supported).toBe(false);
    expect(pickBestModel(support)).toBe('base');
  });

  it('allows small on mid CPU', () => {
    const support = getModelSupport({
      ramGB: 8,
      logicalCores: 6,
      gpu: { backend: 'cpu', vramGB: 0 },
    });
    expect(support.small.supported).toBe(true);
    expect(support.medium.supported).toBe(false);
    expect(pickBestModel(support)).toBe('small');
  });

  it('prefers medium on strong CPU', () => {
    const support = getModelSupport({
      ramGB: 32,
      logicalCores: 8,
      gpu: { backend: 'cpu', vramGB: 0 },
    });
    expect(support.medium.supported).toBe(true);
    expect(support['large-v3'].supported).toBe(false);
    expect(support['large-v3'].reason).toBe('Too slow on CPU.');
    expect(pickBestModel(support)).toBe('medium');
  });

  it('enables large-v3 with enough VRAM', () => {
    const support = getModelSupport({
      ramGB: 16,
      logicalCores: 8,
      gpu: { backend: 'cuda', vramGB: 10 },
    });
    expect(support['large-v3'].supported).toBe(true);
    expect(pickBestModel(support)).toBe('large-v3');
  });

  it('falls back to small when detection fails', () => {
    const support = getModelSupport(null);
    expect(support.small.supported).toBe(true);
    expect(pickBestModel(support)).toBe('small');
  });
});
