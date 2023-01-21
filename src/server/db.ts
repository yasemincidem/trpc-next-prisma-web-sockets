import { PrismaClient, Prisma } from "@prisma/client";

export { Prisma };
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: ["error"],
  });

global.prisma = prisma;
