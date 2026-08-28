import { describe, it, expect } from 'vitest';
import { discoveryUrl, persistUrlFor, resolveGoogleFont, type CssFetcher } from './googleFontsUrl';

function css(family: string, faces: { weight: number; italic?: boolean }[]): string {
  return faces
    .map(
      ({ weight, italic }) => `@font-face {
  font-family: '${family}';
  font-style: ${italic ? 'italic' : 'normal'};
  font-weight: ${weight};
  src: url(https://fonts.gstatic.com/s/x.woff2) format('woff2');
}`,
    )
    .join('\n');
}

/** `serve` maps a URL to the CSS it answers with; anything unlisted 400s, the
 *  way the API rejects a range a family's axis cannot serve. */
function fetcher(serve: Record<string, string>): { fetch: CssFetcher; calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    fetch: async (url: string) => {
      calls.push(url);
      const body = serve[url];
      return {
        ok: body !== undefined,
        status: body === undefined ? 400 : 200,
        text: async () => body ?? '',
      };
    },
  };
}

const ALL_WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900];

describe('persistUrlFor', () => {
  it('uses a range when the weights are contiguous', () => {
    expect(persistUrlFor('Cinzel', [400, 500, 600, 700, 800, 900], false)).toBe(
      'https://fonts.googleapis.com/css2?family=Cinzel:wght@400..900&display=swap',
    );
  });

  it('enumerates when they are not', () => {
    expect(persistUrlFor('Lato', [100, 300, 400, 700, 900], false)).toBe(
      'https://fonts.googleapis.com/css2?family=Lato:wght@100;300;400;700;900&display=swap',
    );
  });

  it('carries the italic axis when the family has one', () => {
    expect(persistUrlFor('Inter', ALL_WEIGHTS, true)).toBe(
      'https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,100..900;1,100..900&display=swap',
    );
  });

  it('goes bare for a single regular weight', () => {
    expect(persistUrlFor('Mystery Quest', [400], false)).toBe(
      'https://fonts.googleapis.com/css2?family=Mystery+Quest&display=swap',
    );
  });
});

describe('resolveGoogleFont', () => {
  it('takes the census from the probe and confirms the narrower URL', async () => {
    const probe = discoveryUrl('Inter');
    const persist = persistUrlFor('Inter', ALL_WEIGHTS, true);
    const served = css(
      'Inter',
      ALL_WEIGHTS.flatMap((weight) => [{ weight }, { weight, italic: true }]),
    );
    const { fetch, calls } = fetcher({ [probe]: served, [persist]: served });

    const found = await resolveGoogleFont('Inter', fetch);

    expect(found).toMatchObject({ name: 'Inter', url: persist, weights: ALL_WEIGHTS, italics: true });
    expect(calls).toEqual([probe, persist]);
  });

  it('falls back to the enumerated form when the range is refused', async () => {
    const probe = discoveryUrl('Slabby');
    const weights = [400, 500, 600, 700];
    const served = css('Slabby', weights.map((weight) => ({ weight })));
    const enumerated = 'https://fonts.googleapis.com/css2?family=Slabby:wght@400;500;600;700&display=swap';
    const { fetch, calls } = fetcher({ [probe]: served, [enumerated]: served });

    const found = await resolveGoogleFont('Slabby', fetch);

    expect(found.url).toBe(enumerated);
    expect(calls[1]).toBe('https://fonts.googleapis.com/css2?family=Slabby:wght@400..700&display=swap');
  });

  it('names the family as Google spells it, not as the caller typed it', async () => {
    const probe = discoveryUrl('mystery quest');
    const served = css('Mystery Quest', [{ weight: 400 }]);
    const bare = 'https://fonts.googleapis.com/css2?family=Mystery+Quest&display=swap';
    const { fetch } = fetcher({ [probe]: served, [bare]: served });

    const found = await resolveGoogleFont('mystery quest', fetch);

    expect(found).toMatchObject({ name: 'Mystery Quest', url: bare, weights: [400], italics: false });
  });

  it('reports a family that is not on Google Fonts', async () => {
    const { fetch } = fetcher({});
    await expect(resolveGoogleFont('Notafont Xyzzy', fetch)).rejects.toThrow(/not on Google Fonts/);
  });
});

describe('resolveGoogleFont over a browser fetch', () => {
  /** Google sends no `Access-Control-Allow-Origin` on a 400, so the browser
   *  rejects rather than handing back the response. */
  function corsFetcher(serve: Record<string, string>): { fetch: CssFetcher; calls: string[] } {
    const calls: string[] = [];
    return {
      calls,
      fetch: async (url: string) => {
        calls.push(url);
        const body = serve[url];
        if (body === undefined) throw new TypeError('Failed to fetch');
        return { ok: true, status: 200, text: async () => body };
      },
    };
  }

  it('reports a missing family instead of leaking the CORS rejection', async () => {
    const { fetch } = corsFetcher({});
    await expect(resolveGoogleFont('Notafont Xyzzy', fetch)).rejects.toThrow(/not on Google Fonts/);
  });

  it('retries a lower-cased family in the casing Google matches', async () => {
    const probe = discoveryUrl('Domine');
    const served = css('Domine', [400, 500, 600, 700].map((weight) => ({ weight })));
    const persist = persistUrlFor('Domine', [400, 500, 600, 700], false);
    const { fetch, calls } = corsFetcher({ [probe]: served, [persist]: served });

    const found = await resolveGoogleFont('domine', fetch);

    expect(found).toMatchObject({ name: 'Domine', url: persist });
    expect(calls[0]).toBe(discoveryUrl('domine'));
    expect(calls[1]).toBe(probe);
  });
})
