Suppose a team needs to add an account capability, expose it in the API, and build the corresponding control.

There are several tasks here. That doesn't mean there are several independent tasks.

An agent can inspect existing permission behavior while another investigates the UI conventions. Those findings can be useful independently. Implementing both sides of a new contract before agreeing what it means is a less promising kind of parallelism.

Different files do not establish independence. The API and control may make incompatible assumptions without producing a single merge conflict.

This is the organizational problem I expect agent adoption to expose. We can start more work. We still have to design the work so its results fit together.

### Before dispatch

Decide what the capability means. Name the operation, identify who may perform it, and specify the behavior when access changes. Have someone own that agreement.

Then divide the work around the settled contract. A task should contain enough context to act, a bounded result, and a way to establish completion. If it discovers that a constraint can't be met, returning the finding is legitimate progress. Quietly inventing a workaround is a different outcome.

Repository agents can read, edit, and run checks. That makes their output more substantial than an autocomplete suggestion. It doesn't make a vague assignment clearer.

The same preparation helps human teammates. The difference is how much plausible output can appear before someone notices the ambiguity.

### At integration

Imagine the API task passes its checks and the UI task passes its checks. We still need evidence that the control invokes the intended operation, that the permission is enforced, and that failure produces the agreed behavior.

Someone owns that acceptance. The agent's completion message cannot serve as ongoing ownership of the capability after release.

That person doesn't need to repeat every mechanical step. They need evidence appropriate to the risk and enough understanding to challenge the important choices. A test output, a visible interaction, and inspection of an authorization boundary answer different questions.

Keep the work small enough that this remains practical. If one reviewer receives a pile of large patches, the team has increased a queue. More generation capacity won't process it.

The environment deserves boundaries as well. Give the task the access its work requires. Separate preparing a change from releasing it where the consequences justify that distinction. Make it possible to explain what may change and who accepts it without recovering instructions from an old chat.

### After the first few attempts

Look at the corrections. If reviewers keep fixing the same issue, improve the examples or the contract. If tasks keep stopping at setup, repair the environment. If useful work accumulates before integration, change the amount or shape of work being started.

These findings tell us more about the operating model than a count of completed agent tasks.

They also identify investments that become more valuable: dependable checks, clear interfaces, and repository guidance that matches actual practice. Those are the conditions under which delegation can reduce effort rather than relocate it.

There is a people question we cannot ignore. Engineers learn judgment by implementing, debugging, and seeing consequences. If tools perform more of those steps, teams need to preserve opportunities to understand them. Have people investigate failures, explain proposed changes, and compare alternatives. Senior engineers should make acceptance decisions teachable.

I don't have a conversion rate between agents and employees. Products and risks differ, and a team's ability to specify and verify work matters enormously. A staffing formula would conceal most of what we need to learn.

Start with a real workflow, settle its shared decisions, and observe the result. The surprising limit may be a boundary the team already knew was unclear.
