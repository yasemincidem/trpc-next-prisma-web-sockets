import { createTRPCRouter, publicProcedure } from "../trpc";
import { prisma } from "../../db";
import { z } from "zod";
import { ee, Events } from "./room";

export const messageRouter = createTRPCRouter({
  findMany: publicProcedure
    .input(z.object({ roomId: z.string() }))
    .query(async ({ input }) => {
      console.log("input", input);
      return await prisma?.message?.findMany({
        include: { user: true, room: true },
        where: { roomId: input.roomId },
      });
    }),
  findOne: publicProcedure.input(z.string()).query(async ({ input }) => {
    return await prisma?.message?.findUnique({ where: { id: input } });
  }),
  addMessage: publicProcedure
    .input(
      z.object({ userId: z.string(), text: z.string(), roomId: z.string() })
    )
    .mutation(async ({ input }) => {
      return await prisma.message.create({
        data: {
          id: Math.random().toString(),
          userId: input.userId,
          roomId: input.roomId,
          createdAt: new Date(),
          updatedAt: new Date(),
          text: input.text,
        },
      });
    }),
});
