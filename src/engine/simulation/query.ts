import type { QueryResultItem, SimulationResult } from "../models";
import { formatFrameCount } from "../utils/time";
import { queryFrame } from "./simulator";

export interface QueryResponse {
  header: string;
  items: QueryResultItem[];
  text: string;
}

export function buildQueryResponse(result: SimulationResult, frame: number): QueryResponse {
  const items = queryFrame(result, frame);
  const header = `\u3010\u67e5\u8be2\u65f6\u95f4\uff1a${formatFrameCount(frame)}\u3011`;
  const lines =
    items.length > 0
      ? items.map((item) => `${item.name} (${item.templateName}) ${item.description}`)
      : ["\u5f53\u524d\u6ca1\u6709\u5728\u573a\u654c\u4eba"];

  return {
    header,
    items,
    text: [header, ...lines].join("\n")
  };
}
