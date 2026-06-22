// Shared types and Fastify request augmentation.

export interface CurrentUser {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
}

declare module 'fastify' {
  interface FastifyRequest {
    currentUser?: CurrentUser;
  }
}
