import { describe, expect, it } from "vitest";

import { sessionTokensFrom } from "@/lib/auth/session-token-from-headers";

const SIG = `${"A".repeat(43)}=`;
const ENC = encodeURIComponent(SIG);

describe("sessionTokensFrom", () => {
  it("returns nothing for a request without session credentials", () => {
    expect(sessionTokensFrom(undefined)).toEqual({ tokens: [], refuse: false });
    expect(sessionTokensFrom(new Headers({ cookie: "theme=dark" }))).toEqual({
      tokens: [],
      refuse: false,
    });
  });

  it("collects the bearer token and every session cookie, deduplicated", () => {
    const headers = new Headers({
      authorization: `Bearer one.${SIG}`,
      cookie: `a=b; better-auth.session_token=two.${ENC}; __Secure-better-auth.session_token=one.${ENC}`,
    });
    expect(sessionTokensFrom(headers)).toEqual({ tokens: ["one", "two"], refuse: false });
  });

  it("strips one pair of quotes the way better-call does", () => {
    const headers = new Headers({ cookie: `better-auth.session_token="tok.${ENC}"` });
    expect(sessionTokensFrom(headers)).toEqual({ tokens: ["tok"], refuse: false });
  });

  it("refuses malformed values instead of skipping them", () => {
    for (const value of ["nodot", "%E0%A4%A", "tok.short", `"tok.${ENC}`]) {
      const headers = new Headers({ cookie: `better-auth.session_token=${value}` });
      expect(sessionTokensFrom(headers)).toEqual({ tokens: [], refuse: true });
    }
  });

  it("refuses more than three session credentials", () => {
    const cookie = Array.from({ length: 3 }, (_, i) => `s${i}.session_token=t${i}.${ENC}`).join(
      "; ",
    );
    const headers = new Headers({ authorization: `Bearer b.${SIG}`, cookie });
    expect(sessionTokensFrom(headers)).toEqual({ tokens: [], refuse: true });
  });
});
