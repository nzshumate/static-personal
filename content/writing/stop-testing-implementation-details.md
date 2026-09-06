A test calls the component's save method and verifies that it called the request helper.

The submit button could be disconnected and this test would remain delighted with the application.

That's the problem with testing the convenient internal path. We can establish that two pieces of code cooperate while missing the connection the user actually relies on.

For an address form, these checks answer different questions:

| Check | What it can establish |
| --- | --- |
| Call a private save method and inspect a spy | That this internal path calls the collaborator |
| Fill the rendered form, submit it, inspect the outgoing request | That the interaction reaches the expected request boundary |
| Submit, receive a rejection, inspect the visible form | That the failure is explained and the person's draft survives |

The first check isn't automatically worthless. If the interaction is the behavior we mean to protect, though, it isn't enough.

This is why I like Testing Library's emphasis on the rendered interface. It helps keep component tests near the contract people use. The same judgment applies outside components: a calculation can be tested through its inputs and outputs without involving a browser.

Pick the boundary that can observe the mistake. Then decide which collaborators need to be real. Mocking a server response can be appropriate for testing the rejected-save UI. That test doesn't establish that the production service enforces the right validation. The service needs evidence at its own boundary.

A test's name should make the promise clear enough that a reader knows what failed. “Preserves the draft after rejection” does more work than “calls handler correctly.”

There are two useful questions to ask while reviewing it.

First, could a meaningful defect survive? Disconnect the button in your head. Drop the draft on failure. Display the wrong result. If the assertions wouldn't notice, improve them or move the test.

Second, could harmless refactoring make it fail? Renaming a private helper shouldn't require renegotiating a user-facing contract. An event name on a reusable component might be public and important. The distinction needs thought; a blanket ban on spies doesn't supply it.

The organizational cost appears when harmless changes regularly produce a wall of red. People learn that failures often mean expectations need updating. Then a real regression arrives with the same presentation and competes with habit.

I want a suite that makes it practical to improve the implementation. Focused assertions, understandable setup, and meaningful boundaries help. A large snapshot routinely approved without inspection generally helps less than its size suggests.

If moving code into a different file breaks twelve tests while disconnecting the button breaks none, the suite is enforcing the wrong agreement.
