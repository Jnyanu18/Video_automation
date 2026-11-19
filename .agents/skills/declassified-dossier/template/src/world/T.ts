// Word-anchored times (output seconds), v5b spine (his take at 1.18x, + security / employment / war lines).
import { OUTRO, WORDS, cue } from "../lib";

// start of the k-th word of `phrase` (nth occurrence of the phrase)
const wAt = (phrase: string, k: number, nth?: number) => {
  const i = WORDS.findIndex((w) => w.s === cue(phrase, nth));
  return WORDS[i + k].s;
};

export const T = {
  // hook
  banned: cue("banned"),
  chinese: cue("Chinese AI."),
  fair: cue("Was that fair?"),
  // Q1
  qWhy: cue("Why did they"),
  qDeep: cue("ban DeepSeek?"),
  // news (Oct 20)
  october: cue("on October"),
  government: cue("government"),
  banning: cue("banning"),
  federal: cue("federal system."),
  // DHS
  homeland: cue("Homeland Security"),
  sensitive: cue("sensitive", 0),
  china: cue("China."),
  // no one wants to send sensitive data outside their country
  noOne: cue("No one wants"),
  sensitive2: cue("sensitive", 1),
  outside: cue("outside their country"),
  country: wAt("outside their country", 2),
  // Enigma (WHAT IF?)
  enigma: cue("Imagine Enigma."),
  british: cue("British"),
  fighting: cue("fighting"),
  encrypt: cue("encrypt"),
  started: cue("started"),
  sending: cue("sending"),
  backTo: cue("back to Germany."),
  germanyE: cue("Germany.", 0),
  // restrict
  notUS: cue("not US."),
  south: cue("South Korea,"),
  italy: cue("Italy,"),
  germany: wAt("and Germany is", 1),
  restricting: cue("restricting"),
  // Q2
  qSo: cue("So is it a"),
  qThreat: cue("security threat or"),
  qPower: cue("power struggle?", 0),
  // his take
  honest: cue("My honest take"),
  aThreat: cue("security threat and"),
  aPower: cue("power struggle.", 1),
  notOr: cue("not or,"),
  and: wAt("it's and.", 1),
  // cars
  example: cue("For example,"),
  carMarket: cue("car market,"),
  pct: cue("100%"),
  tariff: cue("tariff"),
  bydCars: cue("BYD cars.", 0),
  why: cue("Why do they"),
  risk: cue("security risk?"),
  no: wAt("cars, no.", 1),
  power2: cue("power struggle.", 2),
  // employment
  wanna: cue("You wanna keep"),
  automotive: cue("automotive"),
  employs: cue("employs people."),
  cheap: cue("very cheap car"),
  move: cue("immediately move"),
  cheaper: cue("cheaper car,"),
  losingFactories: cue("losing factories,"),
  losingJob: cue("losing people job."),
  // AI parallel: three losses
  soThink: cue("So if you think"),
  makeAI: cue("make AI and"),
  rather: cue("rather than making"),
  buying: cue("buying AI"),
  employment: wAt("losing the employment,", 2),
  tech: cue("technological front,"),
  learning: cue("learning"),
  building: cue("building stuff."),
  // war (hypothetical)
  andWhen: cue("And when the war"),
  warStarts: cue("war starts,"),
  ifWar: cue("if there is a war,"),
  depend: cue("depend on someone"),
  someoneAI: wAt("depend on someone else AI", 2),
  strategize: cue("strategize"),
  battlefield: cue("battlefield,", 0),
  otherPerson: cue("the other person"),
  notGonna: cue("I'm not gonna give"),
  attack: cue("You're using it to"),
  ally: cue("ally."),
  stuckYou: cue("You are basically"),
  stuck: cue("stuck"),
  broken: cue("broken hardware."),
  cantHave: cue("You can't have"),
  becomes: cue("So it becomes"),
  national: cue("national security"),
  power3: cue("power struggle.", 3),
  // verdict
  iSay: cue("I would say"),
  banIt: cue("ban it,", 0),
  restrictIt: cue("restrict it,"),
  but: cue("but at least"),
  competitors: cue("competitors"),
  enter: cue("enter the market."),
  competition: cue("competition"),
  healthy: cue("healthy."),
  // comment prompt
  would: cue("Would you ban"),
  comments: cue("comments"),
  outro: OUTRO.t,
};
