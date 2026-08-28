export type View = "home" | "searching" | "proposal" | "lobby";

export type Member = {
  playerId: string;
  displayName: string;
  contactValue?: string | null;
  riotId?: string;
  game?: "valorant" | "league-of-legends" | "cs2";
  rankSystem?: string;
  rank: number;
  partySize: number;
  roles?: string[];
  accepted?: boolean | null;
  isMe?: boolean;
};

export type ChatMessage = {
  id: string;
  player_id: string;
  body: string;
  created_at: string;
  riot_id?: string;
};

export type StatusPayload = {
  status: "idle" | "searching" | "proposed" | "lobby";
  game?: "valorant" | "league-of-legends" | "cs2";
  search?: {
    rankSystem: string;
    rank: number;
    minRank: number;
    maxRank: number;
    partySize: number;
    targetSize: number;
    servers: string[];
    queueTypes: string[];
    roles: string[];
    maps: string[];
  };
  proposalId?: string;
  lobbyId?: string;
  expiresAt?: string;
  members?: Member[];
  notice?: string;
};
