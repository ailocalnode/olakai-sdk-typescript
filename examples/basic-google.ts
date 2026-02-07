/**
 * Basic Google Generative AI Integration Example
 *
 * This example shows how to use the Olakai SDK
 * to automatically track Google Generative AI (Gemini) API calls.
 */

import { OlakaiSDK } from '@olakai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

async function main() {
  // 1. Initialize Olakai SDK
  const olakai = new OlakaiSDK({
    apiKey: process.env.OLAKAI_API_KEY || 'your-olakai-api-key',
    monitoringEndpoint: 'https://app.olakai.ai/api/monitoring/prompt',
    // Optional: Enable Control API for content blocking
    enableControl: false,
    debug: true // Enable debug logging
  });

  await olakai.init();
  console.log('Olakai SDK initialized');

  // 2. Create Google Generative AI client
  const genAI = new GoogleGenerativeAI(
    process.env.GOOGLE_API_KEY || 'your-google-api-key'
  );

  // 3. Wrap the Google client with Olakai tracking
  const trackedGenAI = olakai.wrap(genAI, {
    provider: 'google',
    defaultContext: {
      userEmail: 'demo-user@example.com',
      task: 'Code Generation',
      subTask: 'Generate TypeScript function',
      chatId: 'demo-session-123'
    }
  });

  console.log('Google Generative AI client wrapped with Olakai tracking');

  // 4. Use the wrapped client normally
  // All metadata is automatically captured and sent to Olakai!
  console.log('\nMaking Google Generative AI call...\n');

  // Get a generative model
  const model = trackedGenAI.getGenerativeModel({ model: 'gemini-pro' });

  // Example 1: Simple generateContent call
  const result = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [{ text: 'Write a function that calculates the fibonacci sequence in TypeScript.' }]
      }
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 500
    }
  });

  const response = result.response;
  const text = response.text();
  console.log('Response:', text);

  console.log('\nAPI call completed!');
  console.log('Automatically tracked:');
  console.log(`   - Model: gemini-pro`);
  if (response.usageMetadata) {
    console.log(`   - Total tokens: ${response.usageMetadata.totalTokenCount}`);
    console.log(`   - Prompt tokens: ${response.usageMetadata.promptTokenCount}`);
    console.log(`   - Completion tokens: ${response.usageMetadata.candidatesTokenCount}`);
  }
  if (response.candidates?.[0]?.finishReason) {
    console.log(`   - Finish reason: ${response.candidates[0].finishReason}`);
  }
  console.log('   - API key: [captured for cost tracking]');
  console.log('   - Request timing: [auto-calculated]');
  console.log('   - All parameters (temperature, maxOutputTokens, etc.)');

  // Example 2: Chat session
  console.log('\n--- Chat Session Example ---\n');

  const chat = model.startChat({
    generationConfig: {
      temperature: 0.9,
      maxOutputTokens: 200
    }
  });

  const chatResult = await chat.sendMessage('What is TypeScript?');
  const chatResponse = chatResult.response;
  console.log('Chat response:', chatResponse.text());

  console.log('\nAll data was sent to Olakai automatically!');
}

main().catch(console.error);
