import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { APP_CONTACT_EMAIL } from "../constants/app";
import {
  FEEDBACK_FROM,
  formatSydneyTime,
  newAccountEmail,
  notifyNewAccount,
  redactMailSecret,
  sendFeedbackEmail,
} from "../server/services/feedback-mail";
import { readFileSync } from "node:fs";

const originalFetch = globalThis.fetch;
const originalKey = process.env.RESEND_API_KEY;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.RESEND_API_KEY;
  else process.env.RESEND_API_KEY = originalKey;
});

describe("feedback email via Resend", () => {
  it("sends from noreply to the contact address and sets Reply-To when the address is known", async () => {
    process.env.RESEND_API_KEY = "re_testkey";
    const calls: { url: string; init: RequestInit }[] = [];
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init: init ?? {} });
      return new Response(JSON.stringify({ id: "email_1" }), { status: 200 });
    }) as typeof fetch;

    const sent = await sendFeedbackEmail("Subject", "<p>Hi</p>", { replyTo: " reader@example.com " });

    assert.equal(sent, true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://api.resend.com/emails");
    const headers = calls[0].init.headers as Record<string, string>;
    assert.equal(headers.Authorization, "Bearer re_testkey");
    assert.deepEqual(JSON.parse(String(calls[0].init.body)), {
      from: FEEDBACK_FROM,
      to: [APP_CONTACT_EMAIL],
      reply_to: "reader@example.com",
      subject: "Subject",
      html: "<p>Hi</p>",
    });
    assert.equal(FEEDBACK_FROM, "Informed Ministries <noreply@informedministries.app>");
    assert.equal(APP_CONTACT_EMAIL, "hello@informedministries.app");

    await sendFeedbackEmail("Subject", "<p>Hi</p>", { replyTo: "not an email" });
    const guest = JSON.parse(String(calls[1].init.body)) as Record<string, unknown>;
    assert.equal("reply_to" in guest, false);
  });

  it("logs Resend's error without the key and still returns false", async () => {
    process.env.RESEND_API_KEY = "re_testkey";
    const logged: string[] = [];
    const originalError = console.error;
    console.error = (...args: unknown[]) => {
      logged.push(args.map(String).join(" "));
    };
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ name: "validation_error", message: "domain not verified, key re_testkey" }), {
        status: 403,
      })) as typeof fetch;

    try {
      const sent = await sendFeedbackEmail("Subject", "<p>Hi</p>", { replyTo: null });
      assert.equal(sent, false);
    } finally {
      console.error = originalError;
    }

    assert.equal(logged.length, 1);
    assert.match(logged[0], /Resend failed \(403\): validation_error: domain not verified/);
    assert.doesNotMatch(logged[0], /re_testkey/);
  });

  it("returns false without calling Resend when the key is missing", async () => {
    delete process.env.RESEND_API_KEY;
    let called = false;
    globalThis.fetch = (async () => {
      called = true;
      return new Response("nope", { status: 500 });
    }) as typeof fetch;

    assert.equal(await sendFeedbackEmail("Subject", "<p>Hi</p>", { replyTo: "not an email" }), false);
    assert.equal(called, false);
    assert.equal(redactMailSecret("failed with re_live_secret"), "failed with [redacted]");
  });

  it("notifies hello@ of a new account in Sydney time without waiting on the send", async () => {
    const summer = formatSydneyTime("2026-01-15T00:00:00.000Z");
    const winter = formatSydneyTime("2026-07-15T00:00:00.000Z");
    assert.match(summer, /15 Jan 2026/);
    assert.match(summer, /11:00 am/);
    assert.match(summer, /AEDT/);
    assert.match(winter, /15 July 2026|15 Jul 2026/);
    assert.match(winter, /10:00 am/);
    assert.match(winter, /AEST/);

    const notice = newAccountEmail({
      displayName: " Ada\nLovelace ",
      email: "ada@example.com",
      method: "Email and password",
      createdAt: "2026-01-15T00:00:00.000Z",
    });
    assert.equal(notice.subject, "[New account] Ada Lovelace");
    assert.match(notice.html, /Ada Lovelace/);
    assert.match(notice.html, /ada@example.com/);
    assert.match(notice.html, /Email and password/);
    assert.match(notice.html, /Sydney/);
    assert.match(notice.html, /AEDT/);

    process.env.RESEND_API_KEY = "re_testkey";
    const calls: { init: RequestInit }[] = [];
    globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
      calls.push({ init: init ?? {} });
      return new Response(JSON.stringify({ id: "email_2" }), { status: 200 });
    }) as typeof fetch;
    assert.equal(
      await notifyNewAccount({
        displayName: "Ada",
        email: "ada@example.com",
        method: "Email and password",
        createdAt: "2026-01-15T00:00:00.000Z",
      }),
      true,
    );
    const body = JSON.parse(String(calls[0].init.body)) as { subject: string; reply_to: string; to: string[] };
    assert.equal(body.subject, "[New account] Ada");
    assert.equal(body.reply_to, "ada@example.com");
    assert.deepEqual(body.to, [APP_CONTACT_EMAIL]);

    const auth = readFileSync(new URL("../server/routes/auth.ts", import.meta.url), "utf8");
    const savedAt = auth.indexOf(".returning()");
    const mailedAt = auth.indexOf("void notifyNewAccount(");
    const respondedAt = auth.indexOf("return res.json({", savedAt);
    assert.ok(savedAt >= 0 && mailedAt > savedAt && respondedAt > mailedAt);
    assert.match(auth, /method: "Email and password"/);
    assert.match(auth, /createdAt: newUser\.createdAt/);
  });
});
