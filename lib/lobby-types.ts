// Plain types shared by the server code and the pages. No imports here on purpose: importing a server module
// from a client page (even `import type`) makes Turbopack's dev server reload the page in a loop.
import type { Room } from "./types";

export interface LobbyRoom {
  code: string; topic: string; host: string;
  online: number;          // players currently in the room: 0, 1 or 2
  seatOpen: boolean;       // someone can still join as player 2
  status: Room["status"]; turnSeconds: number; round: number; maxRounds: number;
}

export interface TrendingTopic {
  statement: string;               // the motion players argue about
  blurb: string;                   // why it's in the news, one line
  tag: string;                     // Tech, Energy, Economy…
  source?: { title: string; url: string; domain: string };
}
