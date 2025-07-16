import { initClient, getQueueSize, clearQueue, flushQueue } from '../index';
import { monitor } from '../src/monitor';

/**
 * Example demonstrating the new modular queue architecture
 */

async function demonstrateModularQueueSystem() {
  console.log('=== Modular Queue System Demo ===\n');

  // 1. Initialize the client (now async due to queue manager initialization)
  console.log('🔧 Initializing client with modular queue system...');
  await initClient({
    apiKey: 'demo-api-key',
    apiUrl: 'https://demo.olakai.ai',
    storageType: 'memory', // Using memory storage for this demo
    debug: true,
    verbose: true
  });
  console.log('✅ Client initialized with modular architecture\n');

  // 2. Create a monitored function
  const calculateSum = monitor({
    name: 'calculateSum',
    capture: ({ args, result }) => ({
      input: { numbers: args[0] },
      output: { sum: result },
      metadata: { operation: 'addition' }
    })
  })(async (numbers: number[]) => {
    return numbers.reduce((sum, num) => sum + num, 0);
  });

  // 3. Use the monitored function (adds items to queue automatically)
  console.log('📊 Calling monitored function multiple times...');
  const result1 = await calculateSum([1, 2, 3, 4]);
  const result2 = await calculateSum([5, 6, 7]);
  const result3 = await calculateSum([8, 9, 10]);

  console.log(`Results: ${result1}, ${result2}, ${result3}`);
  console.log(`📈 Queue size after operations: ${getQueueSize()}\n`);

  // 4. Demonstrate queue management
  console.log('🔄 Queue Management Operations:');
  
  // Check queue size
  console.log(`📊 Current queue size: ${getQueueSize()}`);
  
  // Flush queue (send all items)
  console.log('📤 Flushing queue...');
  await flushQueue();
  console.log(`📊 Queue size after flush: ${getQueueSize()}`);
  
  // Add more items
  await calculateSum([11, 12]);
  await calculateSum([13, 14, 15]);
  console.log(`📊 Queue size after more operations: ${getQueueSize()}`);
  
  // Clear queue (remove without sending)
  console.log('🗑️ Clearing queue...');
  clearQueue();
  console.log(`📊 Queue size after clear: ${getQueueSize()}\n`);

  console.log('✅ Modular queue system demo completed!');
}

/**
 * Example showing the benefits of the modular architecture
 */
function showArchitecturalBenefits() {
  console.log('\n=== Architectural Benefits ===\n');
  
  console.log('🏗️  Modular Design Benefits:');
  console.log('   ✅ Separation of Concerns: Queue logic is isolated');
  console.log('   ✅ Testability: Each module can be tested independently');
  console.log('   ✅ Maintainability: Changes to queue logic don\'t affect client code');
  console.log('   ✅ Reusability: Queue manager can be used in different contexts');
  console.log('   ✅ Storage Flexibility: Storage is completely abstracted');
  
  console.log('\n🔧 Technical Improvements:');
  console.log('   ✅ Dependency Injection: Queue manager receives dependencies');
  console.log('   ✅ Encapsulation: Queue state is private to the manager');
  console.log('   ✅ Interface Segregation: Clear separation between public and private APIs');
  console.log('   ✅ Single Responsibility: Each module has one clear purpose');
  
  console.log('\n📁 File Structure:');
  console.log('   src/');
  console.log('   ├── client.ts          # Client initialization & API calls');
  console.log('   ├── queue/index.ts     # Queue management (NEW!)');
  console.log('   ├── storage/index.ts   # Storage abstraction');
  console.log('   ├── monitor.ts         # Function monitoring');
  console.log('   ├── middleware.ts      # Middleware system');
  console.log('   └── utils.ts           # Utilities');
  
  console.log('\n🎯 Before vs After:');
  console.log('   Before: client.ts had 500+ lines with mixed responsibilities');
  console.log('   After:  Clean separation with focused modules');
  console.log('   Before: Hard to test queue logic in isolation');
  console.log('   After:  Queue manager can be tested independently');
  console.log('   Before: Storage logic scattered across client');
  console.log('   After:  Storage completely abstracted and modular');
}

/**
 * Run all examples
 */
async function runAllExamples() {
  try {
    await demonstrateModularQueueSystem();
    showArchitecturalBenefits();
    
    console.log('\n🎉 All modular architecture examples completed!');
  } catch (error) {
    console.error('❌ Error running examples:', error);
  }
}

// Export for use in other files
export {
  demonstrateModularQueueSystem,
  showArchitecturalBenefits,
  runAllExamples
};

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples();
} 