import { describe, expect, it } from "vitest";

import { sessionTokensFrom } from "@/lib/auth/session-token-from-headers";

describe("sessionTokensFrom", () => {
  it("returns nothing for a request without credentials", () => {
    expect(sessionTokensFrom(undefined)).toEqual([]);
    expect(sessionTokensFrom(new Headers({ cookie: "theme=dark" }))).toEqual([]);
  });

  it("collects the bearer token and every session cookie, deduplicated", () => {
    const headers = new Headers({
      authorization: "Bearer one.c2ln",
      cookie:
        "a=b; better-auth.session_token=two.c2ln; __Secure-better-auth.session_token=one.c2ln",
    });
    expect(sessionTokensFrom(headers)).toEqual(["one", "two"]);
  });

  it("decodes cookie values and drops malformed ones", () => {
    const headers = new Headers({
      cookie:
        "__Secure-better-auth.session_token=tok.c2ln%3D; x.session_token=%E0%A4%A; y.session_token=nodot",
    });
    expect(sessionTokensFrom(headers)).toEqual(["tok"]);
  });
});
