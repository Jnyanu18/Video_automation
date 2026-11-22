import { MetaAstryx, seconds as MetaAstryxSeconds } from "./meta-astryx";
import { AgencyLaunchNight, seconds as AgencyLaunchNightSeconds } from "./agency-launch-night";
import { OpenInbox, seconds as OpenInboxSeconds } from "./open-inbox";
import { EchoHermes, seconds as EchoHermesSeconds } from "./echo-hermes";
import { AnthropicTeams, seconds as AnthropicTeamsSeconds } from "./anthropic-teams";
import { CompanyAi, seconds as CompanyAiSeconds } from "./company-ai";
import { EccKeynote, seconds as EccKeynoteSeconds } from "./ecc-keynote";
import { EccDevTeam, seconds as EccDevTeamSeconds } from "./ecc-dev-team";
import { AgencyNativeVsCross, seconds as AgencyNativeVsCrossSeconds } from "./agency-native-vs-cross";
import { ThreeRepos, seconds as ThreeReposSeconds } from "./three-repos";
import { BlaShield, seconds as BlaShieldSeconds } from "./bla-shield";
import { ReverseAnything, seconds as ReverseAnythingSeconds } from "./reverse-anything";
import { AiSleep, seconds as AiSleepSeconds } from "./ai-sleep";
import { GhostVsSubstack, seconds as GhostVsSubstackSeconds } from "./ghost-vs-substack";
import { Freellmapi, seconds as FreellmapiSeconds } from "./freellmapi";
import { NetMerge, seconds as NetMergeSeconds } from "./net-merge";
import { AgencyWeGotYou, seconds as AgencyWeGotYouSeconds } from "./agency-we-got-you";
import { ClaudeMouseSurgery, seconds as ClaudeMouseSurgerySeconds } from "./claude-mouse-surgery";
import { SaasForZero2, seconds as SaasForZero2Seconds } from "./saas-for-zero-2";
import { WhyWeDream, seconds as WhyWeDreamSeconds } from "./why-we-dream";
import { AnthropicGap, seconds as AnthropicGapSeconds } from "./anthropic-gap";
import { ThreeAgents, seconds as ThreeAgentsSeconds } from "./three-agents";
import { ClaudeKilledInstagram, seconds as ClaudeKilledInstagramSeconds } from "./claude-killed-instagram";
import { Agent25Steps, seconds as Agent25StepsSeconds } from "./agent-25-steps";
import { FloorplanMap, seconds as FloorplanMapSeconds } from "./floorplan-map";
import { RocketStyles, seconds as RocketStylesSeconds } from "./rocket-styles";
import { TradepilotForecastRange, seconds as TradepilotForecastRangeSeconds } from "./tradepilot-forecast-range";
import { WeightSpaceProgramming, seconds as WeightSpaceProgrammingSeconds } from "./weight-space-programming";
import { FridgeHackNews, seconds as FridgeHackNewsSeconds } from "./fridge-hack-news";
import { SecurityTop10, seconds as SecurityTop10Seconds } from "./security-top-10";
import { LemoOpuscar, seconds as LemoOpuscarSeconds } from "./lemo-opuscar";
import { LinkedinOs, seconds as LinkedinOsSeconds } from "./linkedin-os";
import { WhyItWentViral, seconds as WhyItWentViralSeconds } from "./why-it-went-viral";
import { Harvey, seconds as HarveySeconds } from "./harvey";
import { Openjarvis, seconds as OpenjarvisSeconds } from "./openjarvis";
import { AskverbThreeSteps, seconds as AskverbThreeStepsSeconds } from "./askverb-three-steps";
import { AskverbHowDoI, seconds as AskverbHowDoISeconds } from "./askverb-how-do-i";
import { AskverbFomo, seconds as AskverbFomoSeconds } from "./askverb-fomo";
import { AskverbShipToday, seconds as AskverbShipTodaySeconds } from "./askverb-ship-today";
import { BlackOctober, seconds as BlackOctoberSeconds } from "./black-october";
import { BinanceHack, seconds as BinanceHackSeconds } from "./binance-hack";
import { ClaudeCodeBackdoor, seconds as ClaudeCodeBackdoorSeconds } from "./claude-code-backdoor";
import { BuildYourOwnX, seconds as BuildYourOwnXSeconds } from "./build-your-own-x";
import { CloneAppsShort, seconds as CloneAppsShortSeconds } from "./clone-apps-short";
import { ThirtyClaudePlugins, seconds as ThirtyClaudePluginsSeconds } from "./thirty-claude-plugins";
import { AgentReach, seconds as AgentReachSeconds } from "./agent-reach";
import { BuildYourJarvis, seconds as BuildYourJarvisSeconds } from "./build-your-jarvis";
import { AwsCredits, seconds as AwsCreditsSeconds } from "./aws-credits";
import { YcPitchData, seconds as YcPitchDataSeconds } from "./yc-pitch-data";
import { YcApplyGuide, seconds as YcApplyGuideSeconds } from "./yc-apply-guide";
import { SaasForZero, seconds as SaasForZeroSeconds } from "./saas-for-zero";
import { AiChatbotLiability, seconds as AiChatbotLiabilitySeconds } from "./ai-chatbot-liability";
import { FreeBusinessEmail, seconds as FreeBusinessEmailSeconds } from "./free-business-email";
// import { LivesafeFounderCut, LivesafeOverlay, seconds as LivesafeFounderCutSeconds } from "./livesafe-founder-cut";
import { QrWarships, seconds as QrWarshipsSeconds } from "./qr-warships";
import { RoofNumbers, seconds as RoofNumbersSeconds } from "./roof-numbers";
import { PlayStore12Testers, seconds as PlayStore12TestersSeconds } from "./play-store-12-testers";
import { PinkDolphins, seconds as PinkDolphinsSeconds } from "./pink-dolphins";
import { WhatIsVerb, seconds as WhatIsVerbSeconds } from "./what-is-verb";
import { Day12FeatureTrap, seconds as Day12FeatureTrapSeconds } from "./day-12-feature-trap";
import { AiloLaunch, seconds as AiloLaunchSeconds } from "./ailo-launch";
import { CohortPitchDay, seconds as CohortPitchDaySeconds } from "./cohort-pitch-day";
import React from "react";

// One line per video. lanes/animated/new.py adds to this list; nothing else needs to change when a video is added.
export type VideoEntry = { slug: string; Scene: React.FC; seconds: number };

export const VIDEOS: VideoEntry[] = [
  // registry:entries
  { slug: "meta-astryx", Scene: MetaAstryx, seconds: MetaAstryxSeconds },
  { slug: "agency-launch-night", Scene: AgencyLaunchNight, seconds: AgencyLaunchNightSeconds },
  { slug: "open-inbox", Scene: OpenInbox, seconds: OpenInboxSeconds },
  { slug: "echo-hermes", Scene: EchoHermes, seconds: EchoHermesSeconds },
  { slug: "anthropic-teams", Scene: AnthropicTeams, seconds: AnthropicTeamsSeconds },
  { slug: "company-ai", Scene: CompanyAi, seconds: CompanyAiSeconds },
  { slug: "ecc-keynote", Scene: EccKeynote, seconds: EccKeynoteSeconds },
  { slug: "ecc-dev-team", Scene: EccDevTeam, seconds: EccDevTeamSeconds },
  { slug: "agency-native-vs-cross", Scene: AgencyNativeVsCross, seconds: AgencyNativeVsCrossSeconds },
  { slug: "three-repos", Scene: ThreeRepos, seconds: ThreeReposSeconds },
  { slug: "bla-shield", Scene: BlaShield, seconds: BlaShieldSeconds },
  { slug: "reverse-anything", Scene: ReverseAnything, seconds: ReverseAnythingSeconds },
  { slug: "ai-sleep", Scene: AiSleep, seconds: AiSleepSeconds },
  { slug: "ghost-vs-substack", Scene: GhostVsSubstack, seconds: GhostVsSubstackSeconds },
  { slug: "freellmapi", Scene: Freellmapi, seconds: FreellmapiSeconds },
  { slug: "net-merge", Scene: NetMerge, seconds: NetMergeSeconds },
  { slug: "agency-we-got-you", Scene: AgencyWeGotYou, seconds: AgencyWeGotYouSeconds },
  { slug: "claude-mouse-surgery", Scene: ClaudeMouseSurgery, seconds: ClaudeMouseSurgerySeconds },
  { slug: "saas-for-zero-2", Scene: SaasForZero2, seconds: SaasForZero2Seconds },
  { slug: "why-we-dream", Scene: WhyWeDream, seconds: WhyWeDreamSeconds },
  { slug: "anthropic-gap", Scene: AnthropicGap, seconds: AnthropicGapSeconds },
  { slug: "three-agents", Scene: ThreeAgents, seconds: ThreeAgentsSeconds },
  { slug: "claude-killed-instagram", Scene: ClaudeKilledInstagram, seconds: ClaudeKilledInstagramSeconds },
  { slug: "agent-25-steps", Scene: Agent25Steps, seconds: Agent25StepsSeconds },
  { slug: "floorplan-map", Scene: FloorplanMap, seconds: FloorplanMapSeconds },
  { slug: "rocket-styles", Scene: RocketStyles, seconds: RocketStylesSeconds },
  { slug: "tradepilot-forecast-range", Scene: TradepilotForecastRange, seconds: TradepilotForecastRangeSeconds },
  { slug: "weight-space-programming", Scene: WeightSpaceProgramming, seconds: WeightSpaceProgrammingSeconds },
  { slug: "fridge-hack-news", Scene: FridgeHackNews, seconds: FridgeHackNewsSeconds },
  { slug: "security-top-10", Scene: SecurityTop10, seconds: SecurityTop10Seconds },
  { slug: "lemo-opuscar", Scene: LemoOpuscar, seconds: LemoOpuscarSeconds },
  { slug: "linkedin-os", Scene: LinkedinOs, seconds: LinkedinOsSeconds },
  { slug: "why-it-went-viral", Scene: WhyItWentViral, seconds: WhyItWentViralSeconds },
  { slug: "harvey", Scene: Harvey, seconds: HarveySeconds },
  { slug: "openjarvis", Scene: Openjarvis, seconds: OpenjarvisSeconds },
  { slug: "askverb-three-steps", Scene: AskverbThreeSteps, seconds: AskverbThreeStepsSeconds },
  { slug: "askverb-how-do-i", Scene: AskverbHowDoI, seconds: AskverbHowDoISeconds },
  { slug: "askverb-fomo", Scene: AskverbFomo, seconds: AskverbFomoSeconds },
  { slug: "askverb-ship-today", Scene: AskverbShipToday, seconds: AskverbShipTodaySeconds },
  { slug: "black-october", Scene: BlackOctober, seconds: BlackOctoberSeconds },
  { slug: "binance-hack", Scene: BinanceHack, seconds: BinanceHackSeconds },
  { slug: "claude-code-backdoor", Scene: ClaudeCodeBackdoor, seconds: ClaudeCodeBackdoorSeconds },
  { slug: "build-your-own-x", Scene: BuildYourOwnX, seconds: BuildYourOwnXSeconds },
  { slug: "clone-apps-short", Scene: CloneAppsShort, seconds: CloneAppsShortSeconds },
  { slug: "thirty-claude-plugins", Scene: ThirtyClaudePlugins, seconds: ThirtyClaudePluginsSeconds },
  { slug: "agent-reach", Scene: AgentReach, seconds: AgentReachSeconds },
  { slug: "build-your-jarvis", Scene: BuildYourJarvis, seconds: BuildYourJarvisSeconds },
  { slug: "aws-credits", Scene: AwsCredits, seconds: AwsCreditsSeconds },
  { slug: "yc-pitch-data", Scene: YcPitchData, seconds: YcPitchDataSeconds },
  { slug: "yc-apply-guide", Scene: YcApplyGuide, seconds: YcApplyGuideSeconds },
  { slug: "saas-for-zero", Scene: SaasForZero, seconds: SaasForZeroSeconds },
  { slug: "ai-chatbot-liability", Scene: AiChatbotLiability, seconds: AiChatbotLiabilitySeconds },
  { slug: "free-business-email", Scene: FreeBusinessEmail, seconds: FreeBusinessEmailSeconds },
  { slug: "cohort-pitch-day", Scene: CohortPitchDay, seconds: CohortPitchDaySeconds },
  // Client edit (16:9 only): the type over the footage for stills, and the type alone (transparent) for the render.
  // { slug: "livesafe-founder-cut", Scene: LivesafeFounderCut, seconds: LivesafeFounderCutSeconds },
  // { slug: "livesafe-founder-cut-overlay", Scene: LivesafeOverlay, seconds: LivesafeFounderCutSeconds },
  { slug: "qr-warships", Scene: QrWarships, seconds: QrWarshipsSeconds },
  { slug: "roof-numbers", Scene: RoofNumbers, seconds: RoofNumbersSeconds },
  { slug: "play-store-12-testers", Scene: PlayStore12Testers, seconds: PlayStore12TestersSeconds },
  { slug: "pink-dolphins", Scene: PinkDolphins, seconds: PinkDolphinsSeconds },
  { slug: "what-is-verb", Scene: WhatIsVerb, seconds: WhatIsVerbSeconds },
  { slug: "day-12-feature-trap", Scene: Day12FeatureTrap, seconds: Day12FeatureTrapSeconds },
  { slug: "ailo-launch", Scene: AiloLaunch, seconds: AiloLaunchSeconds },
];
