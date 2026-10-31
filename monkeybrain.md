# monkeybrain.md: Narad explained simply 🐒

## What is it?

A website where **two people argue** about a topic, like "Nuclear power is safer than fossil fuels".

The difference from a normal argument: **a robot fact-checks every sentence while you argue.**
Say something true and you get points. Make something up and you lose points. Most points at the end wins.

## How does one turn work?

1. You type your argument (short, 90 seconds max).
2. The robot reads it and picks out the **facts**, like "coal kills more people than nuclear".
   Opinions like "I think nuclear is cool" are ignored. You can't fact-check an opinion.
3. For each fact, the robot:
   - **Googles it** (that's *TinySearch*)
   - **Reads the websites it found** (that's *TinyFetch*)
   - **Decides**: true ✅, false ❌, kind of misleading ⚠️, or can't tell 🤷
   - **Takes a screenshot** of the website with the proof highlighted in yellow (that's *TinyBrowser*), so you can see it isn't making things up.
4. Points get added or taken away. The other player's turn starts.

## What's a "Challenge"?

If you think your opponent lied and the robot couldn't tell for sure, you hit **Challenge**.

That sends in **"The Investigator"** (that's *TinyAgent*). It's a robot that actually **uses a website like a human**:
it opens a data website, clicks the menus, picks the country and year, and finds the real number.
**Both players watch it do this live** on screen.

- If the opponent was wrong: you get **+10**, they lose points.
- If they were right: you lose **5** for crying wolf.

You only get 2 challenges, so use them wisely.

## Points, simply

- True fact: **+10**
- False fact: **−15** (lying costs more than truth earns)
- Misleading: **−5**
- Can't tell / opinion: **0**
- Spamming lots of facts: only your first 3 true facts count fully
- Off-topic facts count for less

## Who built what?

- **Member A** built the robot brain: searching, reading, judging, screenshots, the Investigator.
- **Member B** built everything you see: the rooms, the turns, the timer, the score, the cards, the winner screen.

## What's TinyFish?

A company whose tools let programs use the internet:

| Tool | What it does in our app | Costs money? |
|---|---|---|
| TinySearch | Searches the web for proof | Free |
| TinyFetch | Reads the web pages | Free |
| TinyBrowser | Opens a real browser to take proof screenshots | Tiny bit |
| TinyAgent | The Investigator, a robot that clicks around websites | Yes, per click (so we only use it for Challenges) |

We have **$16** total, so the expensive Investigator is used carefully, and we save its answers so a repeated question costs nothing.

## What's Gemini?

Google's AI. It's the "thinking" part: it picks the facts out of your argument and decides whether the websites prove them true or false.
TinyFish gets the information; Gemini judges it.

## Why it's cool (the pitch)

Online arguments are full of made-up statistics. Narad makes **being right the way to win**, and it **shows the proof**
instead of just saying "trust me".
