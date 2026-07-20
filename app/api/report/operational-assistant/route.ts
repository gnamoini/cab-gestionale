import { handleOperationalAssistantPost } from "@/lib/operational-intelligence/api/report-operational-brief-api";

export async function POST(request: Request) {
  return handleOperationalAssistantPost(request);
}
