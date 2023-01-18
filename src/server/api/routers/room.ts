import { z } from "zod";
import { randomUUID } from "crypto";
import { observable } from "@trpc/server/observable";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { EventEmitter } from "events";
import { prisma } from "../../db";

export const sendMessageSchema = z.object({
  roomId: z.string(),
  message: z.string(),
  userId: z.string(),
});
export const closeConnectionSchema = z.object({
  roomId: z.string(),
});
const messageSchema = z.object({
  id: z.string(),
  message: z.string(),
  roomId: z.string(),
  userId: z.string(),
  sentAt: z.date(),
  sender: z.object({
    name: z.string(),
  }),
});
export type Message = z.TypeOf<typeof messageSchema>;
export enum Events {
  SEND_MESSAGE = "SEND_MESSAGE",
  CLOSE_CONNECTION = "CLOSE_CONNECTION",
  ENTER_ROOM = "ENTER_ROOM",
}

export const messageSubSchema = z.object({
  roomId: z.string(),
});
export const ee = new EventEmitter();

export const roomRouter = createTRPCRouter({
  sendMessage: publicProcedure
    .input(sendMessageSchema)
    .mutation(({ ctx, input }) => {
      const message: Message = {
        id: randomUUID(),
        ...input,
        sentAt: new Date(),
        sender: {
          name: ctx.session?.user?.name || "unknown",
        },
      };

      ee.emit(Events.SEND_MESSAGE, message);
      return message;
    }),
  addRooms: publicProcedure
    .input(
      z.object({ roomId: z.string(), name: z.string(), userId: z.string() })
    )
    .mutation(async ({ input }) => {
      console.log("input new", input);
      await prisma.room.deleteMany({
        where: {
          userId: input.userId,
        },
      });
      return await prisma.room.create({
        data: {
          id: Math.random().toString(),
          name: input.name,
          userId: input.userId,
          roomId: input.roomId,
        },
      });
    }),
  findMany: publicProcedure.query(async () => {
    return await prisma.room.findMany();
  }),
  findOne: publicProcedure.input(z.string()).query(async ({ input }) => {
    return await prisma.room.findUnique({
      where: { id: input },
      include: { users: true },
    });
  }),
  closeConnection: publicProcedure
    .input(closeConnectionSchema)
    .mutation(({ ctx, input }) => {
      const message: Message = {
        id: randomUUID(),
        ...input,
        message: `${ctx.session?.user?.name ?? ""} left the room`,
        sentAt: new Date(),
        sender: {
          name: ctx.session?.user?.name || "unknown",
        },
      };

      ee.emit(Events.CLOSE_CONNECTION, message);
      return message;
    }),

  onCloseConnection: publicProcedure.subscription(() => {
    return observable<Message>((emit) => {
      const onConnection = (data: any) => {
        // emit data to client
        emit.next(data);
      };
      // trigger `onConnection()` when `add` is triggered in our event emitter
      ee.on(Events.CLOSE_CONNECTION, onConnection);
      // unsubscribe function when client disconnects or stops subscribing
      return () => {
        ee.off(Events.CLOSE_CONNECTION, onConnection);
      };
    });
  }),
  onEnterRoom: publicProcedure.subscription(() => {
    return observable<Message>((emit) => {
      const onConnection = (data: any) => {
        // emit data to client
        console.log("sdasa", data);
        emit.next(data);
      };
      // trigger `onConnection()` when `add` is triggered in our event emitter
      ee.on(Events.ENTER_ROOM, onConnection);
      // unsubscribe function when client disconnects or stops subscribing
      return () => {
        ee.off(Events.ENTER_ROOM, onConnection);
      };
    });
  }),

  onSendMessage: publicProcedure.subscription(() => {
    return observable<Message>((emit) => {
      const onMessage = async (data: Message) => {
        // emit data to client
        const user = await prisma.user.findMany();
        console.log("listener event", user);
        data.user = user;
        emit.next(data);
      };
      // trigger `onMessage()` when `add` is triggered in our event emitter
      ee.on(Events.SEND_MESSAGE, onMessage);
      // unsubscribe function when client disconnects or stops subscribing
      return () => {
        ee.off(Events.SEND_MESSAGE, onMessage);
      };
    });
  }),
});
