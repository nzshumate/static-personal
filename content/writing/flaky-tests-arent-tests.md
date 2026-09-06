A failure followed by a pass is still an unexplained failure.

That's the rule I want a release process to preserve. The software may be wrong, the test may be wrong, or the environment may be unreliable. Retrying has established intermittency. It hasn't identified the cause.

A flaky test can be useful evidence of a real race. The title is about its fitness as a release gate: if people routinely ignore its failures, it cannot provide the dependable signal we're claiming to have.

For the checks I own, I prefer zero automatic full-test retries by default. If infrastructure needs a separate retry policy, make that explicit and retain the first result. Don't turn “passed eventually” into an ordinary pass without the distinction being visible.

This does **not** prohibit waiting for asynchronous behavior. An assertion polling for an expected state within a sensible timeout is observing the application. Restarting a failed test is a different operation. Confusing the two can make a supposedly strict suite unnecessarily brittle.

When an intermittent failure appears, I would investigate in this order.

1. **Verify the starting state.** Did setup succeed? Did another test change the same record? A fresh browser context isolates browser state, not a shared database account. Reproduce with independent data and examine any dependence on test order.
2. **Verify the action and the wait.** Did the test interact with the intended control? Was the expected condition meaningful? A spinner disappearing may indicate completion or failure. A fixed delay only indicates elapsed time.
3. **Follow the application's behavior.** A lost save or inconsistent response can be the defect the test was meant to reveal. Don't repair the test to tolerate it before understanding it.
4. **Reproduce the relevant conditions.** Concurrency and resource pressure can expose failures that a local run misses. Turning off every other worker may hide a shared dependency rather than fix it.

Preserve traces and logs early enough to show the cause. A final screenshot may show only what was left after the useful evidence disappeared.

The correction should follow the finding. Give competing tests separate data. Replace an incorrect wait. Repair the product race. Address the environment capacity problem. Increasing every timeout is a rather expensive way to avoid choosing among these.

Afterward, repeat the repaired test under the conditions that exposed the issue. A burn-in gives an intermittent failure more opportunities to return. A sequence of passes increases confidence; it doesn't prove that every possible race is gone. Record what you actually exercised.

If quarantine is necessary, identify the coverage gap and give the repair an owner. Otherwise quarantine becomes deletion with better public relations.

Management needs to provide time for this work. A team rewarded only for turning the release green will get good at turning it green. First-run reliability should remain visible separately from eventual success, and recurring environment defects should not be charged indefinitely to whoever submitted the unlucky commit.

Last month's faster pipeline is valuable because the answer arrives sooner. This policy is about making the answer worth receiving. When a failure appears, someone should be able to investigate it without first deciding whether the suite is bluffing.
