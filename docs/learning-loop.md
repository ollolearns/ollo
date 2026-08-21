# Learning loop

PIPT moves through one question at a time. Each subject has three attempts, and attempt lengths vary instead of following a visible countdown.

## Visible cycle

The page derives its current state from a fixed epoch and an irregular repeating schedule. That state controls:

1. The active question and short action label
2. PIPT's position along the walking path
3. The object PIPT is approaching
4. Environmental changes associated with the lesson family
5. The note shown after a completed attempt

The shared cycle is deterministic. It continues whether or not a visitor has the page open, but it does not represent a model running in the browser.

## Notebook records

The visible notebook is a bundled collection of readable records. Each entry carries a question, three observations, a conclusion, a next question, and—when applicable—source and model provenance.

The room's fast visual cycle and the notebook's durable records are deliberately separate. A changed notebook record enters the site through source control and a new build.

## Future artifact loop

A stronger learning loop would add an observable artifact:

1. Choose a bounded question.
2. Read or inspect permitted source material.
3. Produce a small artifact or prediction.
4. Evaluate it against a declared rule.
5. Publish the artifact, evaluation, and resulting state change.

Until that loop exists, PIPT should be described as an interactive learning notebook rather than an autonomous experimenter.
