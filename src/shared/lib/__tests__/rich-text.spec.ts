// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import {
    escapeHtml,
    isRichTextEmpty,
    RICH_TEXT_MAX_CHARS,
    richTextToPlainText,
    sanitizeRichText,
    toRichText,
} from "@/src/shared/lib/rich-text";

// ── sanitizeRichText ────────────────────────────────────────────

describe("sanitizeRichText", () => {
    it("keeps the allowed formatting subset", () => {
        const input = "<ul><li><strong>net pay</strong> <em>verified</em></li></ul>";
        expect(sanitizeRichText(input)).toBe(input);
    });

    it("keeps paragraphs and line breaks", () => {
        expect(sanitizeRichText("<p>hello</p><br>")).toBe("<p>hello</p><br>");
    });

    it("keeps ordered lists", () => {
        const input = "<ol><li>first</li><li>second</li></ol>";
        expect(sanitizeRichText(input)).toBe(input);
    });

    it("drops script tags and their payload", () => {
        expect(sanitizeRichText('<p>ok</p><script>alert(document.cookie)</script>')).toBe("<p>ok</p>");
    });

    it("strips event handlers", () => {
        const clean = sanitizeRichText('<p onclick="alert(1)">text</p>');
        expect(clean).not.toContain("onclick");
        expect(clean).toContain("text");
    });

    it("strips href attributes from anchors", () => {
        const clean = sanitizeRichText('<p><a href="javascript:alert(1)">x</a></p>');
        expect(clean).not.toContain("javascript:");
    });

    it("strips img tags entirely (not in whitelist)", () => {
        const clean = sanitizeRichText('<p><img src=x onerror="alert(1)"></p>');
        expect(clean).not.toContain("img");
        expect(clean).not.toContain("onerror");
    });

    it("strips style tags", () => {
        expect(sanitizeRichText('<p>ok</p><style>body{display:none}</style>')).toBe("<p>ok</p>");
    });
});

// ── escapeHtml ──────────────────────────────────────────────────

describe("escapeHtml", () => {
    it("escapes ampersand, angle brackets, quotes", () => {
        expect(escapeHtml('a&b<c>"e')).toBe("a&amp;b&lt;c&gt;&quot;e");
    });

    it("escapes single quotes", () => {
        expect(escapeHtml("it's")).toBe("it&#39;s");
    });
});

// ── richTextToPlainText ─────────────────────────────────────────

describe("richTextToPlainText", () => {
    it("strips all tags", () => {
        expect(richTextToPlainText("<p><strong>bold</strong> text</p>")).toBe("bold text");
    });

    it("converts block-level closes to newlines", () => {
        expect(richTextToPlainText("<p>aaa</p><p>bbb</p>")).toBe("aaa\nbbb");
    });

    it("converts list item closes to newlines", () => {
        expect(richTextToPlainText("<ul><li>one</li><li>two</li></ul>")).toBe("one\ntwo");
    });

    it("decodes HTML entities", () => {
        expect(richTextToPlainText("<p>&amp; &lt; &gt; &quot; &#39;</p>")).toBe('& < > " \'');
    });

    it("decodes &nbsp; to space", () => {
        expect(richTextToPlainText("<p>a&nbsp;b</p>")).toBe("a b");
    });

    it("trims whitespace", () => {
        expect(richTextToPlainText("  <p>ok</p>  ")).toBe("ok");
    });

    it("returns empty string for empty input", () => {
        expect(richTextToPlainText("")).toBe("");
    });
});

// ── isRichTextEmpty ─────────────────────────────────────────────

describe("isRichTextEmpty", () => {
    it("returns true for empty string", () => {
        expect(isRichTextEmpty("")).toBe(true);
    });

    it("returns true for empty paragraph", () => {
        expect(isRichTextEmpty("<p></p>")).toBe(true);
    });

    it("returns true for whitespace-only paragraph", () => {
        expect(isRichTextEmpty("<p>   </p>")).toBe(true);
    });

    it("returns true for empty list", () => {
        expect(isRichTextEmpty("<ul><li></li></ul>")).toBe(true);
    });

    it("returns false for non-empty content", () => {
        expect(isRichTextEmpty("<p>findings</p>")).toBe(false);
    });

    it("returns false for bold-only content", () => {
        expect(isRichTextEmpty("<p><strong>bold</strong></p>")).toBe(false);
    });
});

// ── toRichText ──────────────────────────────────────────────────

describe("toRichText", () => {
    it("returns empty string for empty input", () => {
        expect(toRichText("")).toBe("");
    });

    it("maps legacy plain-text lines to paragraphs", () => {
        expect(toRichText("1. net pay verified\n2. verifier checked"))
            .toBe("<p>1. net pay verified</p><p>2. verifier checked</p>");
    });

    it("handles Windows-style line endings", () => {
        expect(toRichText("line one\r\nline two"))
            .toBe("<p>line one</p><p>line two</p>");
    });

    it("passes through existing HTML after sanitization", () => {
        const result = toRichText("<p>already <strong>html</strong></p>");
        expect(result).toBe("<p>already <strong>html</strong></p>");
    });

    it("neutralizes plain text that looks like markup", () => {
        expect(toRichText("<script>bad</script> plain")).not.toContain("<script>");
    });

    it("escapes special characters in plain text lines", () => {
        expect(toRichText("amount > 500 & < 1000"))
            .toBe("<p>amount &gt; 500 &amp; &lt; 1000</p>");
    });
});

// ── RICH_TEXT_MAX_CHARS ─────────────────────────────────────────

describe("RICH_TEXT_MAX_CHARS", () => {
    it("is 2000", () => {
        expect(RICH_TEXT_MAX_CHARS).toBe(2000);
    });
});
