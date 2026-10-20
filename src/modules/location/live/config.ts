/**
 * The live-location server (Supabase project `saakshi-live`, Mumbai, ap-south-1) and the page
 * contacts open. The publishable key only lets a caller use the four live_* functions in
 * supabase/migrations; it is public by design.
 */
export const LIVE_SERVER = {
  url: 'https://ppmaxuksrdjhnlnfcfgt.supabase.co',
  publishableKey: 'sb_publishable_HTTTU0RIQO5b6Cn9G6kHqA_H7kyg4cG',
};

/** web/live/index.html, served by GitHub Pages. The token goes after the #, so the host never sees it. */
export const LIVE_VIEWER_URL = 'https://aayushtainwala.github.io/Saakshi/live/';

export function viewerLink(viewToken: string): string {
  return `${LIVE_VIEWER_URL}#${viewToken}`;
}

/** How long a share lasts unless stopped sooner; the server allows at most 24 hours. */
export const LIVE_HOURS_CHOICES = [1, 4, 8, 24] as const;
export type LiveHours = (typeof LIVE_HOURS_CHOICES)[number];
