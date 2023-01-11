import { applyWSSHandler } from '@trpc/server/adapters/ws';
import ws from 'ws';
import {appRouter} from "./api/root";
import {createContext} from "./api/routers/context";
import fetch from 'node-fetch';

if (!global.fetch) {
    (global as any).fetch = fetch;
}
const wss = new ws.Server({
    port: 3001,
});
const handler = applyWSSHandler({ wss, router: appRouter, createContext });

wss.on('connection', (ws) => {
    console.log(`➕➕ Connection (${wss.clients.size})`);
    ws.once('close', () => {
        console.log(`➖➖ Connection (${wss.clients.size})`);
    });
});
console.log('✅ WebSocket Server listening on ws://localhost:3001');

process.on('SIGTERM', () => {
    console.log('SIGTERM');
    handler.broadcastReconnectNotification();
    wss.close();
});
