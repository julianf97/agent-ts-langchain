import { createAgent } from 'langchain';
import { createModel } from '../config/model.js';
import { createAgentTools } from '../tools/index.js';
import { BILLING_SYSTEM_PROMPT } from '../prompts/billing.prompt.js';

export function createBillingAgent(token: string) {
  return createAgent({
    model: createModel(),
    tools: createAgentTools(token),
    systemPrompt: BILLING_SYSTEM_PROMPT,
  });
}