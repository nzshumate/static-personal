I want the test to create its own data, perform the action, and report what happened.

I do not want it to require that another test has run first, that the account named “test” hasn't been edited, or that CI is in a forgiving mood.

Playwright is worth serious evaluation for this work. Browser contexts and useful waiting behavior help. They cannot give two tests independent database records if both insist on editing the same one.

Reuse setup code. Be much more careful about reusing mutable state.

Wait for a meaningful condition. A fixed sleep establishes that time has passed, a fact the computer was unlikely to dispute. Check whether the action actually produced the intended result.

If the test fails, keep the evidence. A trace can explain more than the final screenshot. A successful rerun does not explain the original failure.

And please make the test name useful. “Preserves the draft after a rejected save” is a sentence I can act on. “Works correctly” suggests an argument nobody has finished.

A reliable test suite doesn't need personality. We have plenty elsewhere in the repository.
