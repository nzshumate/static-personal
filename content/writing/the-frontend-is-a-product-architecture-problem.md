The design contains one Save button. The implementation needs two services.

That is a decision waiting to happen.

Suppose an account settings screen changes a display preference and a related billing value. One service owns each. The mockup presents them as a single edit. Both requests can succeed independently, and one can fail after the other has completed.

Before building the form, walk through the possibilities:

| Preference update | Billing update | What the product must decide |
| --- | --- | --- |
| Succeeds | Succeeds | What confirms the complete change? |
| Succeeds | Fails | What is saved, what remains pending, and what may be retried? |
| Fails | Succeeds | Can the screen explain and recover from the partial result? |
| No definitive response | Unknown | How do we establish the actual state without creating another unwanted change? |

The frontend can't resolve these questions with a more considerate spinner.

It needs a coherent operation. Perhaps the backend should coordinate the changes. Perhaps the user should perform two visibly separate actions. Perhaps partial success is acceptable with explicit recovery. Those choices depend on the product, and they should be made while changing the contract is still affordable.

This is why frontend leadership belongs in product architecture. The interface is where separate service decisions have to behave like one experience. Leaving it until the presentation stage turns the screen into a collection point for unresolved agreements.

### Make the incomplete states part of design

A realistic prototype should include the states in the table. It doesn't need a finished backend to expose the decisions. Ask a domain expert what the user should believe after each outcome and what they should be able to do next.

Now examine the contracts. Do they return enough information to distinguish the outcomes? Is a retry safe? Can we query the accepted state? Does the interface have a useful explanation when the operation can't proceed?

If the API reports every failure identically, better error copy may be impossible. The frontend needs a distinction the service hasn't supplied. Raise that as a contract issue instead of trying to guess from an error string.

Permissions create a similar dependency. The control can use capability information to decide what to present. The server still enforces the rule. If access changes while the screen is open, the product needs a response to that condition. Hiding the button at initial render doesn't finish the work.

Performance can reveal another mismatch. If the screen needs several sequential requests before it can express one useful choice, inspect whether those dependencies are necessary. A component optimization may recover little of a wait imposed by the contracts.

These are concrete reasons for frontend engineers to influence service design. A general argument about putting logic on one side or the other tends to be less useful than walking through this particular save.

### Assign ownership to the complete behavior

Each team can finish its ticket while the operation remains incoherent. Service A behaves correctly. Service B behaves correctly. The form invokes both. Nobody has accepted what the user experiences when only one succeeds.

Give someone responsibility for that result, with access to the people who can change the contracts. Frontend leadership can make the integration visible, but it shouldn't become a permanent obligation to absorb every unresolved backend decision into client code.

Make a workaround's cost explicit. If the frontend coordinates partial completion, describe the state it must retain, the recovery it can support, and the limitations. Sometimes that arrangement is justified. It deserves an actual decision rather than arriving as the last available option before release.

The evidence for acceptance should cross the same boundary as the user's task. Component tests and service tests contribute, but the complete journey needs checking too. Include interrupted and rejected operations where they matter.

Shared controls help with repeated interface behavior. A design system can standardize presentation. Neither can define what this Save means by itself.

Faster AI-assisted implementation makes the timing of these decisions more important. A convincing form can appear before the operation behind it has been agreed. Use that speed to expose the missing states early. Don't mistake visual completeness for a settled product.

The organizational change is straightforward to describe and harder to maintain: involve frontend judgment during workflow and contract design, and keep someone accountable through verification of the complete result. That requires time from the relevant teams, not merely an invitation to review the final mockup.

One button is a compact promise. The architecture has to support everything it leads the user to expect.
