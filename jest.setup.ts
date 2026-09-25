// Jest setup for Life OS
// Note: This file is intentionally minimal to avoid jest mock issues

// Global error handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Mock crypto for tests
if (!global.crypto) {
  global.crypto = {
    randomUUID: () => Math.random().toString(36).substring(2, 15),
  } as any;
}
