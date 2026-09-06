The request is to let an account administrator change the default currency.

Before drawing any boxes, follow the change through the application. There's a control somewhere. A value arrives from a service. A rule determines whether the person can edit it. A request updates it. Other parts of the page may need to respond.

The architecture is already present in those relationships. A new directory tree won't tell us whether they're sensible.

Suppose three screens read the currency from a deeply nested billing response. The service team changes that response. All three screens now need edits, even though none of their behavior has changed.

A small mapping function could give the feature a stable representation. It receives the service's shape and produces the information the feature needs. The screens then depend on that representation. One external change has one obvious place to go.

That is a boundary doing useful work. It can be a function. It doesn't need a department.

There is a cost to mapping data, and I wouldn't add it between every pair of operations by reflex. Here it protects several consumers from transport details that aren't part of their job. That is a reason a reviewer can evaluate.

Now consider the select control. It can display currencies. It shouldn't need to import the account feature to decide which currencies this customer is allowed to choose. Give it the choices. Keep the product decision near the feature that owns it, with enforcement on the server.

Otherwise the control gradually acquires account-specific knowledge while keeping a general name. The next feature imports it and gets the billing policy as a complimentary accessory.

This is the same problem I wrote about with component boundaries in 2018, at a larger scale. A visual resemblance suggests something we might share. It doesn't establish shared responsibility.

The currency change also crosses a human boundary. Someone owns the service, someone owns the screen, and perhaps a third team owns the control. If every adjustment requires all three teams to negotiate, ask what they're actually coordinating.

They may share a meaningful rule that needs agreement. They may also be coordinating because unrelated behavior ended up in a shared file. Splitting that file could make work cheaper even if a little duplication returns.

Conversely, private copies of a rule that must remain identical can create a worse coordination problem later. Currency formatting and currency eligibility deserve different names and potentially different owners. “Currency utilities” is an easy folder to create and a poor explanation of either.

I would write down the few decisions that constrain future work: where external data enters the feature, where permission decisions come from, and which modules are allowed to depend on which. Include the currency change as an example. The document should help the next engineer make a decision, not merely help them find the files.

Then try another request against the arrangement. Display the currency on a summary page. Change the service response. Add a condition under which editing is unavailable. Can the relevant behavior move without pulling unrelated features into the work?

Also try a failure. If the update is rejected, does the feature have enough information to explain what happened? Does the rest of the page remain usable? A vague error passed unchanged through several tidy layers is still a vague error.

This kind of exercise is cheap enough to do before reorganizing the repository. It exposes dependencies more honestly than a discussion of which folder naming convention scales best.

I don't expect an architecture to anticipate every future requirement. I expect it to make the current responsibilities understandable and the next plausible changes manageable.

When the work is done, the administrator should be able to change the currency. The engineer doing the work should not have had to become an expert in every screen that happens to display money.
