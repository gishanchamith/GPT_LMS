// Values handed from globalSetup to the test files via provide()/inject().
declare module 'vitest' {
  export interface ProvidedContext {
    mongoUri: string;
  }
}

export {};
