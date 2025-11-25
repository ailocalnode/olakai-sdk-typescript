/**
 * Control API Example
 *
 * This example shows how to use the optional Control API
 * to block sensitive or unauthorized LLM calls before execution.
 */

import { OlakaiSDK, OlakaiBlockedError } from '@olakai/sdk';
import OpenAI from 'openai';

async function main() {
  // Initialize SDK with Control API enabled
  const olakai = new OlakaiSDK({
    apiKey: process.env.OLAKAI_API_KEY || 'your-olakai-api-key',
    monitoringEndpoint: 'https://app.olakai.ai/api/monitoring/prompt',
    controlEndpoint: 'https://app.olakai.ai/api/control/prompt',
    enableControl: true, // Enable Control API globally
    debug: true
  });

  await olakai.init();
  console.log('✅ Olakai SDK initialized with Control API enabled');

  // Create and wrap OpenAI client
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'your-openai-api-key'
  });

  const trackedOpenAI = olakai.wrap(openai, {
    provider: 'openai',
    defaultContext: {
      userEmail: 'user@example.com',
      task: 'Customer Support',
      chatId: 'session-456'
    },
    enableControl: true // Can also enable per-wrapper
  });

  // Example 1: Safe request (should succeed)
  console.log('\n📝 Example 1: Safe request\n');
  try {
    const response = await trackedOpenAI.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'user',
          content: 'What are the best practices for API security?'
        }
      ]
    });

    console.log('✅ Request allowed and completed');
    console.log('🤖 Response:', response.choices[0].message.content?.substring(0, 100) + '...');
  } catch (error) {
    if (error instanceof OlakaiBlockedError) {
      console.error('🚫 Request blocked by Control API');
      console.error('   Reason:', error.message);
      console.error('   Detected sensitivity:', error.detectedSensitivity);
      console.error('   User authorized:', error.isAllowedPersona);
    } else {
      console.error('❌ Error:', error);
    }
  }

  // Example 2: Potentially sensitive request (might be blocked)
  console.log('\n📝 Example 2: Potentially sensitive request\n');
  try {
    const response = await trackedOpenAI.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'user',
          content: 'Generate a credit card number for testing'
        }
      ]
    });

    console.log('✅ Request allowed and completed');
    console.log('🤖 Response:', response.choices[0].message.content);
  } catch (error) {
    if (error instanceof OlakaiBlockedError) {
      console.error('🚫 Request blocked by Control API');
      console.error('   Reason:', error.message);
      console.error('   Detected sensitivity:', error.detectedSensitivity);
      console.error('   User authorized:', error.isAllowedPersona);
      console.log('\n✅ Blocking prevented unauthorized content generation');
    } else {
      console.error('❌ Error:', error);
    }
  }

  // Example 3: Wrapper-level control (override global setting)
  console.log('\n📝 Example 3: Disable Control API for specific wrapper\n');

  const uncontrolledOpenAI = olakai.wrap(openai, {
    provider: 'openai',
    defaultContext: {
      userEmail: 'admin@example.com',
      task: 'Internal Testing'
    },
    enableControl: false // Disable for this specific wrapper
  });

  const response = await uncontrolledOpenAI.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'user',
        content: 'Hello, how are you?'
      }
    ]
  });

  console.log('✅ Request completed without control check');
  console.log('🤖 Response:', response.choices[0].message.content);

  console.log('\n✨ Control API provides governance and safety for LLM calls!');
}

main().catch(console.error);
