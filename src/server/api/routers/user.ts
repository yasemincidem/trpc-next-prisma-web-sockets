import { createTRPCRouter, publicProcedure } from "../trpc";
import { prisma } from "../../db";

export const userRouter = createTRPCRouter({
  findMany: publicProcedure.query(async () => {
    return await prisma.user.findFirst();
  }),
});
