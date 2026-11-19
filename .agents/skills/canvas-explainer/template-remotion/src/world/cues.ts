// Every time the world uses, as cue("phrase") on the spine words (output seconds). cue() throws if a phrase is
// missing or said more than once (pass nth), so an EDL change that removes a cue word fails loudly.
import { cue } from "../lib";

export const K = {
  bought: cue("just bought"), startup: cue("startup"),
  could: cue("Could AI"), faster: cue("faster"),
  yes: cue("I would think yes"),
};
