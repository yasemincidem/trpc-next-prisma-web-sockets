import { z } from "zod";
import { randomUUID } from "crypto";
import { observable } from "@trpc/server/observable";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { EventEmitter } from "events";
import { prisma, Prisma } from "../../db";

const message = Prisma.validator<Prisma.MessageArgs>()({
  select: {
    id: true,
    text: true,
    createdAt: true,
    userName: true,
    userId: true,
    roomId: true,
  },
});
const user = Prisma.validator<Prisma.UserArgs>()({
  select: {
    id: true,
    roomId: true,
    name: true,
  },
});
export type MessageType = Prisma.MessageGetPayload<typeof message>;
export type UserType = Prisma.UserGetPayload<typeof user>;

type MessageOutputType = {
  message: MessageType;
  users: UserType[];
};
export enum Events {
  SEND_MESSAGE = "SEND_MESSAGE",
  ENTER_ROOM = "ENTER_ROOM",
}
export const ee = new EventEmitter();

export const roomRouter = createTRPCRouter({
  sendMessage: publicProcedure
    .input(
      z.object({ text: z.string(), userId: z.string(), roomId: z.string() })
    )
    .mutation(({ ctx, input }) => {
      const message: MessageType = {
        id: randomUUID(),
        createdAt: new Date(),
        userName: ctx.session?.user?.name || "unknown",
        ...input,
      };
      ee.emit(Events.SEND_MESSAGE, message);
      return message;
    }),
  enterRoom: publicProcedure
    .input(z.object({ roomId: z.string() }))
    .mutation(({ input }) => {
      ee.emit(Events.ENTER_ROOM, input);
    }),
  findMany: publicProcedure.query(async () => {
    return await prisma.room.findMany({ include: { users: true } });
  }),
  findOne: publicProcedure.input(z.string()).query(async ({ input }) => {
    const room = await prisma.room.findUnique({
      where: { id: input },
      include: { users: true },
    });
    return room;
  }),
  onSendMessage: publicProcedure.subscription(() => {
    return observable<MessageOutputType>((emit) => {
      const onMessage = async (message: MessageType) => {
        const users = await prisma.user.findMany();
        // emit data to client
        emit.next({ message, users });
      };
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      ee.on(Events.SEND_MESSAGE, onMessage);
      return () => {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        ee.off(Events.SEND_MESSAGE, onMessage);
      };
    });
  }),
  onEnterRoom: publicProcedure.subscription(() => {
    return observable<UserType[]>((emit) => {
      const onMessage = async (data: { roomId: string }) => {
        const users = await prisma.user.findMany({
          where: { roomId: data.roomId },
        });
        // emit data to client
        emit.next(users);
      };
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      ee.on(Events.ENTER_ROOM, onMessage);
      return () => {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        ee.off(Events.ENTER_ROOM, onMessage);
      };
    });
  }),
});
