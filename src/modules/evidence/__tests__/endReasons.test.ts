import { describeEndReason } from '../export/contents';

describe('describeEndReason (hash report)', () => {
  it('says in plain words that locking the phone stops iPhone video, and sound carries on', () => {
    const text = describeEndReason('app-left');
    expect(text).toContain('the phone was locked');
    expect(text).toContain('sound carried on');
  });

  it("words iOS's own reasons for stopping the camera", () => {
    expect(describeEndReason('camera-in-use')).toContain('another app');
    expect(describeEndReason('system-pressure')).toContain('too hot');
  });

  it('shows a reason from a newer format as it is', () => {
    expect(describeEndReason('some-new-reason')).toBe('some-new-reason');
  });
});
