/**
 * Vercel AI SDK Integration Example
 *
 * This example shows how to use Olakai SDK with Vercel AI SDK
 * to automatically track LLM calls across 25+ providers
 */

import { OlakaiSDK } from '@olakai/sdk';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';

async function main() {
  // 1. Initialize Olakai SDK
  const olakai = new OlakaiSDK({
    apiKey: process.env.OLAKAI_API_KEY || 'your-olakai-api-key',
    monitoringEndpoint: 'https://app.olakai.ai/api/monitoring/prompt',
    debug: true
  });

  await olakai.init();
  console.log('✅ Olakai SDK initialized\n');

  // ============================================================
  // Example 1: OpenAI with generateText
  // ============================================================
  console.log('📝 Example 1: OpenAI with generateText\n');

  const openaiResult = await olakai.generateText(
    {
      model: openai('gpt-4'),
      prompt: 'Write a haiku about TypeScript',
      temperature: 0.7,
      maxTokens: 100
    },
    {
      task: 'Creative Writing',
      subTask: 'Haiku Generation',
      userEmail: 'demo@example.com',
      apiKey: process.env.OPENAI_API_KEY, // For cost tracking
      chatId: 'demo-session-1'
    }
  );

  console.log('🤖 OpenAI Response:', openaiResult.text);
  console.log('📊 Usage:', openaiResult.usage);
  console.log('🏁 Finish Reason:', openaiResult.finishReason);
  console.log('✅ Automatically tracked to Olakai!\n\n');

  // ============================================================
  // Example 2: Anthropic Claude
  // ============================================================
  console.log('📝 Example 2: Anthropic Claude\n');

  const claudeResult = await olakai.generateText(
    {
      model: anthropic('claude-3-sonnet'),
      prompt: 'Explain what makes TypeScript type-safe in one sentence',
      maxTokens: 100
    },
    {
      task: 'Educational Content',
      subTask: 'Explanation',
      userEmail: 'demo@example.com',
      apiKey: process.env.ANTHROPIC_API_KEY,
      chatId: 'demo-session-2'
    }
  );

  console.log('🤖 Claude Response:', claudeResult.text);
  console.log('📊 Usage:', claudeResult.usage);
  console.log('✅ Automatically tracked to Olakai!\n\n');

  // ============================================================
  // Example 3: Google Gemini
  // ============================================================
  console.log('📝 Example 3: Google Gemini\n');

  const geminiResult = await olakai.generateText(
    {
      model: google('gemini-pro'),
      prompt: 'What are the benefits of using AI SDKs?',
      maxTokens: 150
    },
    {
      task: 'Research',
      subTask: 'Q&A',
      userEmail: 'demo@example.com',
      apiKey: process.env.GOOGLE_API_KEY,
      chatId: 'demo-session-3'
    }
  );

  console.log('🤖 Gemini Response:', geminiResult.text);
  console.log('📊 Usage:', geminiResult.usage);
  console.log('✅ Automatically tracked to Olakai!\n\n');

  // ============================================================
  // Example 4: Switch providers with same code!
  // ============================================================
  console.log('📝 Example 4: Provider switching\n');

  const providers = [
    { name: 'OpenAI GPT-4', model: openai('gpt-4'), apiKey: process.env.OPENAI_API_KEY },
    { name: 'Claude 3', model: anthropic('claude-3-sonnet'), apiKey: process.env.ANTHROPIC_API_KEY },
    { name: 'Gemini', model: google('gemini-pro'), apiKey: process.env.GOOGLE_API_KEY }
  ];

  const prompt = 'Count to three';

  for (const provider of providers) {
    try {
      const result = await olakai.generateText(
        {
          model: provider.model,
          prompt,
          maxTokens: 50
        },
        {
          task: 'Provider Comparison',
          userEmail: 'demo@example.com',
          apiKey: provider.apiKey
        }
      );

      console.log(`${provider.name}: ${result.text.substring(0, 50)}...`);
    } catch (error) {
      console.log(`${provider.name}: Error - ${error}`);
    }
  }

  console.log('\n✅ All providers automatically tracked with same code!');

  // ============================================================
  // Example 5: Streaming
  // ============================================================
  console.log('\n📝 Example 5: Streaming\n');

  const streamResult = await olakai.streamText(
    {
      model: openai('gpt-4'),
      prompt: 'Write a short story about a robot learning to code',
      maxTokens: 200
    },
    {
      task: 'Creative Writing',
      subTask: 'Short Story',
      userEmail: 'demo@example.com',
      apiKey: process.env.OPENAI_API_KEY
    }
  );

  console.log('🤖 Streaming response:');
  for await (const chunk of streamResult.textStream) {
    process.stdout.write(chunk);
  }

  console.log('\n\n✅ Stream tracked automatically when complete!');

  // ============================================================
  // Summary
  // ============================================================
  console.log('\n' + '='.repeat(60));
  console.log('🎉 Summary:');
  console.log('- Used OpenAI, Anthropic, and Google providers');
  console.log('- All calls automatically tracked to Olakai');
  console.log('- Metadata captured: tokens, model, timing, API keys');
  console.log('- Same code works across all providers');
  console.log('- Streaming support included');
  console.log('='.repeat(60));
}

main().catch(console.error);
