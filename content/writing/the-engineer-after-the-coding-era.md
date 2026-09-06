The uncomfortable question is how an engineer learns to judge work they didn't have to struggle through producing.

It is easy to say that AI will handle implementation while people supply judgment. That sounds like an agreeable promotion for everyone involved. It leaves out where much of the judgment came from.

An engineer writes something, watches it fail, and discovers an assumption. They try to fix it and encounter a boundary they didn't understand. Eventually they can recognize a similar problem before implementing it. Some of that education is frustrating, repetitive, and expensive. It is also real.

If tools take on more of those steps, we need to preserve the learning without insisting that everyone repeat every inconvenience of our own careers. Familiar suffering is not automatically a curriculum.

This seems more consequential than arguing about whether the title “software engineer” still fits.

Code remains part of the work. Someone needs to understand the system well enough to inspect a generated change, diagnose a failure, and question an apparently sensible design. The amount that person typed is an increasingly poor measure of whether they can do those things.

Consider a change that retries an operation after a timeout. The code may be tidy, and the tests may show the retry happening. The important question is whether performing the operation again is safe when the first result is unknown. Answering that requires understanding the operation, its contract, and the way failure presents itself.

A person can miss the problem while writing the code manually. They can catch it while reviewing generated code. The skill is recognizing the consequence, then getting evidence sufficient to decide what to do.

We should teach and evaluate that skill more directly.

For a developing engineer, ask them to predict a failure before running the check. Have them explain which parts of a proposed implementation depend on an external guarantee. Compare two approaches and identify what each one would require the team to maintain. Let them investigate a real defect with help available.

The tools can support that learning. They can produce an alternative, help explore unfamiliar code, or make a small experiment cheaper. The learning disappears when accepting the answer becomes a substitute for forming an understanding of it.

Senior engineers have a responsibility here. A verdict is less useful than an explanation of the evidence behind it. If a reviewer rejects the retry, explain the uncertainty it introduces. If the contract makes the retry safe, show where that guarantee lives. Make the reasoning available to someone who hasn't already learned the lesson the hard way.

There also needs to be room for less experienced people to own consequences at an appropriate scale. If every meaningful decision is reserved for the most senior person, the organization will keep needing that person. More automated implementation won't repair the apprenticeship structure.

This affects hiring. A coding exercise can establish useful information, but it is an incomplete account of how a person works in an existing system. Add an ambiguous requirement, a plausible but flawed patch, or an unfamiliar failure. See what they ask, what they inspect, and which uncertainty they resolve first.

Don't replace technical evaluation with fluent discussion. A person can talk convincingly about tradeoffs while failing to connect them to the code. Require specifics. The retry example has an actual contract to inspect. A vague preference for “resilience” doesn't answer it.

Performance evaluation needs the same care. A person may make the team more effective by removing unnecessary scope, clarifying a service boundary, or improving the checks that allow others to proceed. Those results deserve recognition even if they reduce the amount of implementation performed.

They should also be evidenced. “Strategic work” can become as empty a category as generated line counts if nobody asks what changed. Name the decision, the removed obstacle, or the capability the team can now maintain more safely.

I don't know the eventual division of labor between engineers and tools. It will vary across products and keep changing. I am wary of advice that treats the outcome as settled, especially when it conveniently validates whatever the speaker already wanted to do with staffing.

The immediate responsibility is clearer. Keep technical understanding close to acceptance. Give people ways to develop it. Adjust the workflow so delegation doesn't separate the team from the consequences of its decisions.

The title's “after” is about what defines the contribution. Code hasn't gone away. Being able to produce it is becoming less sufficient as a description of the job.

I would rather prepare engineers to understand and own a result than teach them to defend the amount of effort it took to produce it.
