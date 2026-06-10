import { describe, expect, it } from "vitest";
import { SessionManager } from "../../src/core/session-manager.ts";

describe("SessionManager.fromEntries", () => {
	function sessionWithHistory(): SessionManager {
		const manager = SessionManager.inMemory("/tmp/from-entries-test");
		manager.appendMessage({ role: "user", content: "hello", timestamp: 1 });
		manager.appendMessage({
			role: "assistant",
			content: [{ type: "text", text: "hi" }],
			api: "anthropic-messages",
			provider: "anthropic",
			model: "claude-test",
			usage: {
				input: 1,
				output: 1,
				cacheRead: 0,
				cacheWrite: 0,
				totalTokens: 2,
				cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
			},
			stopReason: "stop",
			timestamp: 2,
		});
		return manager;
	}

	it("rebuilds a session preserving ids, entries, and leaf", () => {
		const original = sessionWithHistory();
		const header = original.getHeader();
		expect(header).not.toBeNull();

		const rebuilt = SessionManager.fromEntries([header!, ...original.getEntries()]);

		expect(rebuilt.getSessionId()).toBe(original.getSessionId());
		expect(rebuilt.getEntries()).toEqual(original.getEntries());
		expect(rebuilt.getLeafId()).toBe(original.getLeafId());
		expect(rebuilt.isPersisted()).toBe(false);
		expect(rebuilt.getSessionFile()).toBeUndefined();
	});

	it("restores labels and accepts new entries chained to the leaf", () => {
		const original = sessionWithHistory();
		const target = original.getEntries()[0].id;
		original.appendLabelChange(target, "checkpoint");

		const rebuilt = SessionManager.fromEntries([original.getHeader()!, ...original.getEntries()]);

		expect(rebuilt.getLabel(target)).toBe("checkpoint");

		const previousLeaf = rebuilt.getLeafId();
		rebuilt.appendMessage({ role: "user", content: "again", timestamp: 3 });
		const appended = rebuilt.getEntries().at(-1)!;
		expect(appended.parentId).toBe(previousLeaf);
	});

	it("supports cwd override", () => {
		const original = sessionWithHistory();
		const rebuilt = SessionManager.fromEntries([original.getHeader()!, ...original.getEntries()], "/tmp/other-cwd");
		expect(rebuilt.getCwd()).toBe("/tmp/other-cwd");
	});

	it("throws without a session header", () => {
		expect(() => SessionManager.fromEntries([])).toThrow(/no session header/);
	});
});
