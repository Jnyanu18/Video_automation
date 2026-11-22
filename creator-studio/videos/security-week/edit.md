# Edit plan: Update your Node, and here's why

<!-- Written with Claude after the cut is approved. Split layout: he talks in the bottom half, the top half is a
feed of panels changing every 3 to 4 seconds, nothing over his face. Run: python lanes/talking-head/plan.py security-week -->

## Settings
brand: personal
style: clay
layout: split
sfx: on 0.30
captions: on
lower-third: off
music: off
music-mix: security-week/music/track-6.mp3
end-card: Screenshot this | askverb.com

## Beats
<!-- panel "words" look | part | part ...   looks: kinetic, term, alert, shot, count, doodle, versions -->
- panel "I updated" kinetic | I updated | *Node.js | this week
- panel "here's why" kinetic | *Here's why | you should too
- panel "On Wednesday" shot | broll/node.js-tweet.PNG | Oct 21
- panel "one of them" term | > node security release | 4 high-severity bugs | !ATTACKERS CAN RUN CODE
- panel "Update to the latest" term | > update to at least | v22.23.4 | v24.22.1 | v26.12.1
- panel "But in PHP" alert | PHP | It's even worse
- zoom "even bad" 1.1 1.2
- panel "Two major flaws" shot | broll/php-security-tweet.PNG | FBI alert
- panel "without even logging" alert | NO LOGIN NEEDED | Anyone can take over your server
- panel "back till" count | 5.4 | and every version since | PHP
- panel "includes WordPress" kinetic | *WordPress | included
- panel "Eight eMudhra" count | 8 | certificate keys every browser trusted | eMudhra
- panel "guessed easily" count | 17 | months they could be guessed | eMudhra
- panel "one of them was literally" term | > cat private.key | !4 | yes, the number 4
- panel "So now every browser" alert | BLOCKED | Every browser rejects them now
- panel "And Railway says" shot | broll/railway-tweet.PNG | Oct 21
- panel "variables" term | $ printenv | API_KEY=********** | DATABASE_URL=******** | !MAY BE EXPOSED
- panel "API keys and database" kinetic | Your API keys | *database passwords | may be exposed
- panel "So if you are using Railway" alert | ROTATE | Every key. Right now.
- zoom "right now" 1.12 1.2
- panel "One thing nobody" kinetic | Nobody | *tells you this
- panel "keeps the older version" term | > app is running | old version, still in memory | !UPDATE IS NOT ENOUGH
- panel "after you update" doodle | 1. update | 2. restart
- panel "restart everything today" kinetic | *Restart | everything | today
- panel "here's what you should" versions | Node.js: 22.23.4, 24.22.1, 26.12.1 | PHP: 8.2.35, 8.3.36, 8.4.27, 8.5.12 | eMudhra: move to another CA | Railway: rotate every key and secret | Then: restart everything
- zoom "Screenshot this" 1.12 1.0
