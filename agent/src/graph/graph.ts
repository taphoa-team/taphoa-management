import { StateGraph, MessagesAnnotation, START, END } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import type { AIMessage } from "@langchain/core/messages";
import { getLLM } from "../llm.js";
import { readTools } from "../tools/taphoa-read.js";
import { recordPurchaseInvoice } from "../invoice/tool.js";
import { buildSystemMessage } from "../prompts/system.js";
import { normalizeMessageContent } from "./normalize.js";

const allTools = [...readTools, recordPurchaseInvoice];
const llmWithTools = getLLM().bindTools(allTools);

// Node `agent`: gọi LLM, có thể trả lời hoặc đòi gọi tool.
// Prepend system message (vai trò + ngày hôm nay) vào đầu mỗi lượt.
async function agentNode(state: typeof MessagesAnnotation.State) {
  const response = await llmWithTools.invoke([buildSystemMessage(), ...normalizeMessageContent(state.messages)]);
  return { messages: [response] };
}

// Conditional edge: nếu LLM đòi tool → đi "tools"; không → END.
function shouldContinue(state: typeof MessagesAnnotation.State) {
  const last = state.messages[state.messages.length - 1] as AIMessage;
  return last.tool_calls && last.tool_calls.length > 0 ? "tools" : END;
}

const toolNode = new ToolNode(allTools);

export const graph = new StateGraph(MessagesAnnotation)
  .addNode("agent", agentNode)
  .addNode("tools", toolNode)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", shouldContinue, ["tools", END])
  .addEdge("tools", "agent")
  .compile();
