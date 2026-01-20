export type HistoryItem =
  | { type: "text"; content: string }
  | { type: "image"; content: string };
