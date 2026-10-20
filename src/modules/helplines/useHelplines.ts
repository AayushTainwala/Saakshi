import { useEffect, useState } from 'react';

import type { HelplineList } from './schema';
import { loadList, refreshList } from './source';

export type RefreshStatus = 'checking' | 'done' | 'failed';

/** The saved list straight away, then the published one if it is newer. Checks once per mount. */
export function useHelplines(): { list: HelplineList; status: RefreshStatus } {
  const [list, setList] = useState(loadList);
  const [status, setStatus] = useState<RefreshStatus>('checking');

  useEffect(() => {
    let live = true;
    refreshList(loadList())
      .then((fresh) => {
        if (!live) return;
        setList(fresh);
        setStatus('done');
      })
      .catch(() => {
        if (live) setStatus('failed');
      });
    return () => {
      live = false;
    };
  }, []);

  return { list, status };
}
