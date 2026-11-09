import { describe, expect, it } from "vitest";

import { OAUTH_COPY, OAUTH_QUERY_MAX, SCOPE_LABELS } from "@/constants/auth/oauth";
import {
  consentBody,
  continueBody,
  describeOAuthQuery,
  grantLines,
  readOAuthQuery,
  searchFromRecord,
} from "@/lib/auth/continue-oauth";

const SYNC = "https://lorestep.akshitbansal.dev/api/v1/sync";
const SIGNED = [
  "response_type=code",
  "client_id=QHsrHeWAKSsEaVpDisiAwJBAdMXtMNvX",
  "redirect_uri=https%3A%2F%2Fhemmdilibbhbbgionnnfloeilhkiijop.chromiumapp.org%2F",
  "scope=openid+email+offline_access",
  "resource=https%3A%2F%2Florestep.akshitbansal.dev%2Fapi%2Fv1%2Fsync",
  "ba_param=client_id",
  "ba_param=scope",
  "ba_iat=1762600000000",
  "sig=s1gn%2Bature",
].join("&");

describe("readOAuthQuery", () => {
  it("returns the query exactly as received, without the leading ?", () => {
    expect(readOAuthQuery(`?${SIGNED}`)).toBe(SIGNED);
    expect(readOAuthQuery(SIGNED)).toBe(SIGNED);
  });

  it("rejects repeated keys other than ba_param, so the consent page shows what Neon signed", () => {
    for (const extra of [
      "client_id=evil",
      "scope=openid",
      "redirect_uri=https%3A%2F%2Fx.test%2F",
    ]) {
      expect(readOAuthQuery(`${SIGNED}&${extra}`)).toBeNull();
    }
    expect(readOAuthQuery(`${SIGNED}&ba_param=resource`)).toBe(`${SIGNED}&ba_param=resource`);
  });

  it("rejects a query that cannot be a signed request", () => {
    expect(readOAuthQuery("")).toBeNull();
    expect(readOAuthQuery("?")).toBeNull();
    expect(readOAuthQuery("client_id=abc")).toBeNull();
    expect(readOAuthQuery("sig=x")).toBeNull();
    expect(readOAuthQuery("sig=x&client_id=")).toBeNull();
    expect(readOAuthQuery("next=%2Flibrary")).toBeNull();
  });

  it("rejects an oversized query", () => {
    const padded = `sig=x&client_id=abc&pad=${"a".repeat(OAUTH_QUERY_MAX)}`;
    expect(readOAuthQuery(padded)).toBeNull();
  });
});

describe("searchFromRecord", () => {
  it("keeps repeated keys, so Neon's signed parameter list survives the round trip", () => {
    const search = searchFromRecord({
      client_id: "abc",
      ba_param: ["client_id", "scope"],
      sig: "s",
      empty: undefined,
    });
    expect(new URLSearchParams(search).getAll("ba_param")).toEqual(["client_id", "scope"]);
    expect(readOAuthQuery(search)).toBe(search);
  });
});

describe("request bodies", () => {
  it("passes oauth_query through unchanged", () => {
    expect(continueBody(SIGNED)).toEqual({ selected: true, oauth_query: SIGNED });
    expect(consentBody(true, SIGNED)).toEqual({ accept: true, oauth_query: SIGNED });
  });

  it("builds a deny as accept false, so Neon returns access_denied to the client", () => {
    expect(consentBody(false, SIGNED)).toEqual({ accept: false, oauth_query: SIGNED });
  });
});

describe("describeOAuthQuery and grantLines", () => {
  it("reads client, scopes, resource and the redirect host", () => {
    const request = describeOAuthQuery(SIGNED);
    expect(request).toEqual({
      clientId: "QHsrHeWAKSsEaVpDisiAwJBAdMXtMNvX",
      scopes: ["openid", "email", "offline_access"],
      resource: SYNC,
      redirectHost: "hemmdilibbhbbgionnnfloeilhkiijop.chromiumapp.org",
    });
    expect(grantLines(request, SYNC)).toEqual([
      SCOPE_LABELS.openid,
      SCOPE_LABELS.email,
      SCOPE_LABELS.offline_access,
      OAUTH_COPY.syncResource,
    ]);
  });

  it("shows unknown scopes and foreign resources raw, and a bad redirect as no host", () => {
    const request = describeOAuthQuery(
      "client_id=c&sig=s&scope=weird&resource=https%3A%2F%2Fx.test&redirect_uri=nope",
    );
    expect(request.redirectHost).toBeNull();
    expect(grantLines(request, SYNC)).toEqual(["weird", "https://x.test"]);
    expect(grantLines({ ...request, resource: null }, SYNC)).toEqual(["weird"]);
  });
});
