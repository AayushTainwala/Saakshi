import { render } from '@testing-library/react-native';

import { type BackupDeps, excludeFromBackup, useBackupExclusionWith } from '../exclusion';

function fakeDeps() {
  let listener: ((state: string) => void) | null = null;
  const deps: BackupDeps = {
    folders: () => ['file:///app/Documents/'],
    setExcluded: jest.fn(async () => 3),
    onAppState: (l) => {
      listener = l;
      return { remove: () => void (listener = null) };
    },
  };
  return { deps, emit: (state: string) => listener?.(state), listening: () => listener !== null };
}

function Harness({ deps }: { deps: BackupDeps }) {
  useBackupExclusionWith(deps);
  return null;
}

describe('backup exclusion', () => {
  it('marks every folder as excluded, and survives a failure', async () => {
    const { deps } = fakeDeps();
    (deps.setExcluded as jest.Mock).mockRejectedValueOnce(new Error('busy'));
    expect(await excludeFromBackup({ ...deps, folders: () => ['a', 'b'] })).toBe(3);
    expect(deps.setExcluded).toHaveBeenCalledWith('a', true);
    expect(deps.setExcluded).toHaveBeenCalledWith('b', true);
  });

  it('runs at launch and again each time the app goes to the background', async () => {
    const { deps, emit, listening } = fakeDeps();
    const view = await render(<Harness deps={deps} />);
    expect(deps.setExcluded).toHaveBeenCalledTimes(1);
    emit('active');
    expect(deps.setExcluded).toHaveBeenCalledTimes(1);
    emit('background');
    expect(deps.setExcluded).toHaveBeenCalledTimes(2);
    expect(deps.setExcluded).toHaveBeenLastCalledWith('file:///app/Documents/', true);
    await view.unmount();
    expect(listening()).toBe(false);
  });
});
