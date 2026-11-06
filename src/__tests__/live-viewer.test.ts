import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';

/**
 * The live-location page contacts open (web/live/index.html): its own script, run against a small
 * stand-in for the browser's page and fetch. (The test sits here, not beside the page, because the
 * page's whole folder is published.)
 */
const html = readFileSync(join(__dirname, '../../web/live/index.html'), 'utf8');
const script = html.slice(html.lastIndexOf('<script>') + '<script>'.length, html.lastIndexOf('</script>'));

type FakeElement = {
  id?: string;
  textContent: string;
  hidden: boolean;
  href: string;
  src: string;
  className: string;
  target: string;
  rel: string;
  children: FakeElement[];
  innerHTML: string;
  appendChild(child: FakeElement): FakeElement;
};

function element(id?: string): FakeElement {
  const el = {
    id,
    textContent: '',
    hidden: false,
    href: '',
    src: '',
    className: '',
    target: '',
    rel: '',
    children: [] as FakeElement[],
    appendChild(child: FakeElement) {
      el.children.push(child);
      return child;
    },
  } as unknown as FakeElement;
  Object.defineProperty(el, 'innerHTML', {
    get: () => '',
    set: () => {
      el.children = [];
    },
  });
  return el;
}

async function open(hash: string, view: unknown) {
  const elements: Record<string, FakeElement> = {};
  const requests: { url: string; body: unknown }[] = [];
  const context = {
    document: {
      getElementById: (id: string) => (elements[id] ??= element(id)),
      createElement: () => element(),
    },
    location: { hash },
    fetch: async (url: string, init: { body: string }) => {
      requests.push({ url, body: JSON.parse(init.body) });
      return { ok: true, status: 200, json: async () => view };
    },
    setInterval: () => 1,
    clearInterval: () => undefined,
    Date,
    Math,
    JSON,
    encodeURIComponent,
    decodeURIComponent,
  };
  runInNewContext(script, context);
  for (let i = 0; i < 5; i++) await new Promise((resolve) => setImmediate(resolve));
  return { el: (id: string) => elements[id] ?? element(id), requests };
}

const TOKEN = 'AbCdEfGhIjKlMnOpQrStUvWx';
const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();
const position = (m: number, bat?: number | null) => ({ lat: 19.076, lng: 72.8777, acc: 12, at: minutesAgo(m), ...(bat === undefined ? {} : { bat }) });

describe('the live-location page (round 2)', () => {
  it('shows the battery level with how long ago it was sent, in English and Hindi', async () => {
    const page = await open(`#${TOKEN}`, { expiresAt: minutesAgo(-120), persistent: false, positions: [position(3, 82)] });
    expect(page.el('battery').hidden).toBe(false);
    expect(page.el('battery').textContent).toBe('Battery 82% (3 minutes ago) · बैटरी 82% (3 मिनट पहले)');
  });

  it('uses the newest position that has a battery level', async () => {
    const page = await open(`#${TOKEN}`, { expiresAt: minutesAgo(-120), positions: [position(1, null), position(10, 40)] });
    expect(page.el('battery').textContent).toBe('Battery 40% (10 minutes ago) · बैटरी 40% (10 मिनट पहले)');
  });

  it('shows no battery line when the phone never said', async () => {
    const page = await open(`#${TOKEN}`, { expiresAt: minutesAgo(-120), positions: [position(1)] });
    expect(page.el('battery').hidden).toBe(true);
  });

  it('says a share with no fixed end lasts until they stop', async () => {
    const page = await open(`#${TOKEN}`, { expiresAt: minutesAgo(-7 * 24 * 60), persistent: true, positions: [position(1, 50)] });
    expect(page.el('ends').textContent).toBe('Shared until they stop sharing. · जब तक वे शेयर करना बंद न करें, तब तक शेयर होगी।');
  });

  it('still works when a full stop was taken into the link', async () => {
    const page = await open(`#${TOKEN}.`, { expiresAt: minutesAgo(-120), positions: [position(1, 50)] });
    expect(page.requests[0].body).toEqual({ view_token: TOKEN });
    expect(page.el('where').hidden).toBe(false);
  });
});
