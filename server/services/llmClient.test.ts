import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StubLlmClient, OpenAiCompatibleClient, createLlmClient } from './llmClient';

describe('LlmClient', () => {
  describe('StubLlmClient', () => {
    it('should create a stub client and complete JSON', async () => {
      const client = new StubLlmClient();
      const result = await client.completeJson({
        system: 'test system',
        user: 'test user'
      });
      expect(result).toBeDefined();
    });
  });

  describe('createLlmClient', () => {
    it('should create a stub client when no API keys are set', () => {
      delete process.env.GEMINI_API_KEY;
      delete process.env.LLM_API_KEY;
      
      const client = createLlmClient();
      expect(client).toBeDefined();
    });
  });
});
