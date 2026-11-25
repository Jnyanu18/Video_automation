# Your company's own AI: the full checklist

Every company that builds its own AI assistant runs into the same problems in the same order. Here's the checklist, one layer for each problem, so you can build it right the first time.

## 1. System prompt

Give it a name, a tone, and a short list of what it should never do. Without one, it introduces itself as ChatGPT.

## 2. Your docs

Have it read your real documents (HR policies, handbooks, product docs) before it answers, and say where each answer came from. Without this, it confidently makes things up, like a leave policy you don't have.

## 3. Tools

Connect only the actions it really needs: Slack, Jira, your HR system. That's the step from a chatbot that answers to an agent that does the work.

## 4. Permissions

It should only see what the person asking is allowed to see. Pass each user's identity through to every tool call, so an intern can't ask it for the CEO's salary.

## 5. Guardrails

Block "ignore your instructions" style attacks on the way in, and hide private data like salaries and personal details on the way out.

## 6. Cost

Cache answers to repeat questions, and send easy questions to a small, cheap model. Keep the big model for the hard ones. Thousands of employees saying good morning every day adds up fast.

## 7. Logs

Record every prompt and every tool call. When it gets something wrong, that's how you find out why.

## 8. Tests

Keep a set of real questions with the right answers, and run them before every model or prompt change. No pass, no ship. Skip this and one model swap sends you back to day one.
