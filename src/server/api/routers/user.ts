import { createTRPCRouter, publicProcedure } from "../trpc";
import { prisma } from "../../db";
import { z } from "zod";
import { ee, Events } from "./room";

export const userRouter = createTRPCRouter({
  findMany: publicProcedure.query(async () => {
    const users = await prisma.user.findMany();
    return users;
  }),
  findOne: publicProcedure.input(z.string()).query(async ({ input }) => {
    const user = await prisma.user.findUnique({ where: { id: input } });
    return user;
  }),
  addRoom: publicProcedure
    .input(z.object({ roomId: z.string(), userId: z.string() }))
    .mutation(async ({ input }) => {
      const user = await prisma.user.updateMany({
        where: {
          id: input.userId,
        },
        data: {
          roomId: input.roomId,
        },
      });
      ee.emit(Events.ENTER_ROOM, {
        roomId: input.roomId,
        userId: input.userId,
      });
      return user;
    }),
});
