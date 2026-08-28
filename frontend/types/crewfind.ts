export type View = "home" | "searching" | "proposal" | "lobby";

export type Member = {
  playerId: string;
  riotId: string;
  rank: number;
  partySize: number;
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
  proposalId?: string;
  lobbyId?: string;
  expiresAt?: string;
  members?: Member[];
  notice?: string;
};
