import { z } from "zod";
import { randomUUID } from "crypto";
import {observable} from "@trpc/server/observable";
import { createTRPCRouter, publicProcedure } from "../trpc";
import {EventEmitter} from "events";
export const sendMessageSchema = z.object({
    roomId: z.string(),
    message: z.string(),
});
export const closeConnectionSchema = z.object({
    roomId: z.string()
});
const messageSchema = z.object({
    id: z.string(),
    message: z.string(),
    roomId: z.string(),
    sentAt: z.date(),
    sender: z.object({
        name: z.string(),
    }),
});
export type Message = z.TypeOf<typeof messageSchema>;
export enum Events {
    SEND_MESSAGE = "SEND_MESSAGE",
    CLOSE_CONNECTION = "CLOSE_CONNECTION",
}

export const messageSubSchema = z.object({
    roomId: z.string(),
});
const ee = new EventEmitter();
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

    onCloseConnection: publicProcedure
        .subscription(() => {
            return observable<Message>((emit) => {
                const onConnection = (data: Message) => {
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

    onSendMessage: publicProcedure
        .input(messageSubSchema)
        .subscription(({input}) => {
            return observable<Message>((emit) => {
                const onMessage = (data: Message) => {
                    // emit data to client
                    console.log("listener event")
                    emit.next(data);
                };
                // trigger `onMessage()` when `add` is triggered in our event emitter
                ee.on(Events.SEND_MESSAGE, onMessage);
                // unsubscribe function when client disconnects or stops subscribing
                return () => {
                    ee.off(Events.SEND_MESSAGE, onMessage);
                };
            });
        })

});
