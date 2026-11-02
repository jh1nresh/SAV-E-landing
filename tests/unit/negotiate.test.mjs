import assert from "node:assert/strict";
import test from "node:test";
import { negotiate } from "../../lib/negotiate.mjs";

test("Accept negotiation honors quality, specificity, exclusions and browser defaults", () => {
  for (const [accept, expected] of [
    [null, "html"], ["", "html"], ["*/*", "html"], ["text/*", "html"],
    ["text/html", "html"], ["text/markdown", "markdown"],
    ["TEXT/MARKDOWN; charset=UTF-8", "markdown"],
    ['text/markdown;charset="utf-8"', "markdown"],
    ["text/markdown;q=0.2,text/html;q=0.9", "html"],
    ["text/html;q=0.2,text/markdown;q=0.9", "markdown"],
    ["text/markdown, text/html", "markdown"],
    ["text/html, text/markdown", "html"],
    ["text/markdown;q=0, */*;q=1", "html"],
    ["text/html;q=0, */*;q=1", "markdown"],
    ["text/html;q=0,text/markdown;q=0,*/*;q=1", null],
    ["text/*;q=0,*/*;q=1", null],
    ["application/json", null], ["*/*;q=0", null],
    ["text/markdown;q=1.1", null], ["text/markdown;q=garbage", null],
    ["text/markdown;q=1;q=0", null],
    ["text/markdown;q=1,text/markdown;charset=utf-8;q=0,text/html;q=0.5", "html"],
    ["application/text/markdown", null], ["text/markdown;variant=unknown", null],
    ['application/json;profile="a,b",text/html', "html"],
    ["text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", "html"],
  ]) assert.equal(negotiate(accept), expected, String(accept));
});
