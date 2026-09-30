import 'dotenv/config';
import { ChatOpenAI } from '@langchain/openai';
import { validateOpenAiConfig } from '../validators/openai-config.validator.js';

export function createModel() {
  const { OPENAI_API_KEY, OPENAI_MODEL } = process.env;

  validateOpenAiConfig(OPENAI_API_KEY, OPENAI_MODEL);

  return new ChatOpenAI({
    apiKey: OPENAI_API_KEY,
    model: OPENAI_MODEL!,
  });
}