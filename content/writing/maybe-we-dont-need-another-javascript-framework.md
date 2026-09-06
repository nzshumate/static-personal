Give me a framework demo with a failed save in it.

Keep the nice typography. Keep the little animation when an item disappears. Just let the server reject something and show me what happens to the value the user spent ten minutes entering. I'd like to see whether it survives.

That's usually where I start paying attention. Getting a list onto a screen is a useful introduction to a library, but it tells me very little about whether I want to maintain an application built with it. By the time the interesting problems turn up, the demo is over and somebody is posting the benchmark results.

I understand the attraction. A fresh project has no embarrassing dependencies, no mysterious event handler, no comment that says `temporary` above something nobody dares remove. You can read the whole thing. Of course it feels better than the application at work. It has almost no application in it yet.

The trouble starts when we credit the framework for that feeling.

## Follow the value

Consider an account settings page. There's a display name at the top, an edit form underneath, and a save button. The user changes the name. The request fails.

Should the heading show the saved name or the draft? Can the user try again? If they cancel, what gets restored? If another request finishes while they're editing, does it overwrite their input?

These are ordinary questions. They also require decisions that are easy to postpone while everyone is arguing about template syntax.

In a jQuery application, you might have the name sitting in an object, in an input, and in a heading updated by a separate callback. With components, you can put the same confusion into a parent, a child, and a shared store. Now it has a directory structure.

I want to know which value is the saved one, which is the draft, and which code is allowed to change each. Once those decisions are clear, the implementation gets a lot less exciting. That's a reasonable outcome for an account settings page.

React's rendering model can help make updates easier to follow. Vue can take a lot of manual DOM bookkeeping out of the job. Angular offers conventions that a team can agree to use. These are substantial benefits. I have no interest in maintaining a private collection of DOM utilities just to prove I can survive without assistance.

But if the same piece of information has three owners, I'd fix that before pricing a rewrite.

## The rewrite has to carry the awkward parts

Suppose a replacement screen takes two days to build and looks much cleaner. Good. Now try it with the slow response, the expired session, and the record whose optional fields are all empty. Navigate away with unsaved changes. Use the keyboard. Open a link directly instead of arriving through the application's navigation.

The existing screen may contain a stupid amount of code. Some of it may also explain why clicking Back doesn't destroy someone's work.

I'd like that distinction made before we delete it.

This is where a framework comparison becomes useful to me. Take one difficult screen and build enough of it to include the behavior we'd prefer to leave out of the estimate. See how the proposed approach handles it. See whether another engineer can follow the code without the person who wrote it narrating every line.

Count the surrounding work, too. Routing, form validation, tests, the build. If the attractive part is fifty lines but it needs an afternoon of configuration before anyone else can run it, include the afternoon. Webpack and Babel don't become free because their files sit outside `src`.

I don't need the new version to have fewer files. I need a reasonable answer to a specific question: when this behavior changes, where will I have to look?

## There are good reasons to move

An existing application doesn't deserve permanent residency just because it got here first. If every change requires tracing a chain of events through half the page, a component model with explicit inputs may be worth the disruption. If the team keeps implementing the same basic machinery differently, shared conventions could save real work.

That's a case I can evaluate. Show me the recurring problem and how the proposed tool reduces it.

I'm interested in Vue partly because it leaves room to try it on a piece of a page. That makes for a more useful experiment than announcing that we're replacing the frontend and then discovering what the announcement meant. I can learn something from a small implementation, including that I don't want to take it further.

I'd still expect to spend time understanding its behavior. A friendly introduction doesn't exempt a dependency from becoming my problem.

What I have less patience for is the suggestion that using an older approach is, by itself, evidence of failure. A functioning page doesn't acquire a defect when a new repository starts getting attention. There needs to be something wrong with the page.

Before proposing another framework, I'd pick the change we keep finding painful. Trace the data. Find the duplicated responsibility. Try making the boundary clearer in the code we already have. If that works, we get to ship the improvement without moving everything else.

If it doesn't, we have a much better problem to bring to the next tool.

And when we build the demo, let's make the save fail.
