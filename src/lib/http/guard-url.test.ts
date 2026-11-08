import { describe, expect, it, vi } from "vitest";

import { assertSafeUrl, fetchGuardedText, UnsafeUrlError } from "@/lib/http/guard-url";

const HEADERS = { Accept: "text/html" };

const redirect = (location: string) => new Response(null, { status: 302, headers: { location } });
const page = (html: string) => new Response(html, { status: 200 });

describe("assertSafeUrl", () => {
  it.each([
    "https://www.imdb.com/title/tt0111161/",
    "https://imdb.com/title/tt0111161/",
    "https://www.themoviedb.org/movie/278",
    "https://myanimelist.net/anime/1/Cowboy_Bebop",
    "https://www.netflix.com/title/80100172",
    "https://www.primevideo.com/detail/B000",
    "https://www.amazon.co.uk/dp/B000",
  ])("accepts the allowlisted https link %s", (raw) => {
    expect(assertSafeUrl(raw).href).toBe(new URL(raw).href);
  });

  it.each([
    ["plain http", "http://www.imdb.com/title/tt0111161/"],
    ["IPv4 literal", "https://127.0.0.1/title/tt1"],
    ["decimal IPv4 spelling", "https://2130706433/title/tt1"],
    ["IPv6 literal", "https://[::1]/title/tt1"],
    ["localhost", "https://localhost/title/tt1"],
    ["userinfo", "https://user:pass@www.imdb.com/title/tt1"],
    ["userinfo naming the allowed host", "https://www.imdb.com@evil.example/title/tt1"],
    ["a different host", "https://evil.example/title/tt1"],
    ["a lookalike suffix", "https://imdb.com.evil.example/title/tt1"],
    ["an unlisted subdomain", "https://evil.imdb.com/title/tt1"],
    ["an explicit port", "https://www.imdb.com:8443/title/tt1"],
    ["another scheme", "ftp://www.imdb.com/title/tt1"],
    ["not a URL", "imdb.com/title/tt1"],
  ])("rejects %s", (_name, raw) => {
    expect(() => assertSafeUrl(raw)).toThrow(UnsafeUrlError);
  });
});

describe("fetchGuardedText", () => {
  it("returns the page text and never follows redirects by itself", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(page("<title>Dune</title>"));

    await expect(
      fetchGuardedText("https://www.netflix.com/title/1", HEADERS, fetchImpl),
    ).resolves.toBe("<title>Dune</title>");
    expect(fetchImpl.mock.calls[0]?.[1]).toMatchObject({ redirect: "manual" });
  });

  it("follows a redirect that stays on the same host", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(redirect("/title/2"))
      .mockResolvedValueOnce(page("ok"));

    await expect(
      fetchGuardedText("https://www.netflix.com/title/1", HEADERS, fetchImpl),
    ).resolves.toBe("ok");
    expect(String(fetchImpl.mock.calls[1]?.[0])).toBe("https://www.netflix.com/title/2");
  });

  it.each([
    ["a private IP", "https://169.254.169.254/latest/meta-data"],
    ["a plain http URL", "http://www.netflix.com/title/1"],
    ["another allowlisted host", "https://www.imdb.com/title/tt1"],
    ["an unlisted host", "https://evil.example/"],
  ])("rejects a redirect to %s", async (_name, location) => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(redirect(location));

    await expect(
      fetchGuardedText("https://www.netflix.com/title/1", HEADERS, fetchImpl),
    ).rejects.toBeInstanceOf(UnsafeUrlError);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("gives up on a redirect loop", async () => {
    const fetchImpl = vi.fn().mockImplementation(async () => redirect("/again"));

    await expect(
      fetchGuardedText("https://www.netflix.com/title/1", HEADERS, fetchImpl),
    ).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it("rejects a disallowed starting URL without fetching", async () => {
    const fetchImpl = vi.fn();

    await expect(fetchGuardedText("https://127.0.0.1/", HEADERS, fetchImpl)).rejects.toBeInstanceOf(
      UnsafeUrlError,
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("answers null for a non-2xx page or a network failure", async () => {
    const notFound = vi.fn().mockResolvedValueOnce(new Response("no", { status: 404 }));
    const down = vi.fn().mockRejectedValueOnce(new Error("boom"));

    const url = "https://www.netflix.com/t";

    await expect(fetchGuardedText(url, HEADERS, notFound)).resolves.toBeNull();
    await expect(fetchGuardedText(url, HEADERS, down)).resolves.toBeNull();
  });

  it("cuts an oversized body instead of buffering all of it", async () => {
    const chunk = new Uint8Array(100_000).fill(120);
    let sent = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        sent += 1;
        if (sent > 30) controller.close();
        else controller.enqueue(chunk);
      },
    });
    const fetchImpl = vi.fn().mockResolvedValueOnce(new Response(body, { status: 200 }));

    const text = await fetchGuardedText("https://www.netflix.com/t", HEADERS, fetchImpl);

    expect(text?.length).toBeLessThan(3_000_000);
    expect(sent).toBeLessThan(30);
  });
});
