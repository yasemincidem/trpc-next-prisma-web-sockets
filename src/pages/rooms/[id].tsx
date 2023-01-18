import type { Session } from "next-auth";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import type { Message } from "../../server/api/routers/room";
import { api } from "../../utils/api";
import avatarImage from "../../../public/avatar.png";
import Image from "next/image";

function MessageItem({
  message,
  session,
}: {
  message: Message;
  session: Session | null;
}) {
  const baseStyles =
    "mb-4 text-md w-7/12 p-4 text-gray-700 border border-gray-700 rounded-md";

  const liStyles =
    message.user.name === session?.user?.name
      ? baseStyles
      : baseStyles.concat(" self-end bg-gray-700 text-white");

  return (
    <li className={liStyles}>
      <div className="flex">
        <time>
          {message.createdAt.toLocaleTimeString("en-AU", {
            timeStyle: "short",
          })}{" "}
          - {message.user.name}
        </time>
      </div>
      {message.text}
    </li>
  );
}

function RoomPage() {
  const router = useRouter();
  const userId = router.query.id as string;
  const { data: session } = useSession();
  const [message, setMessage] = useState("");
  const [roomId, setRoomId] = useState("");
  const [isRoomChanged, setIsRoomChanged] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const roomsQuery = api.room.findMany.useQuery();
  const roomQuery = api.room.findOne.useQuery(roomId);
  const messageQuery = api.message.findMany.useQuery({ roomId });

  useEffect(() => {
    setMessages(messageQuery.data);
  }, [isRoomChanged, messageQuery.data]);

  api.room.onSendMessage.useSubscription(undefined, {
    onData(message) {
      const user = message.users.find((u) => u.id === userId);
      if (user.roomId === message.roomId) {
        setMessages((m) => {
          return [
            ...m,
            {
              createdAt: new Date(),
              user: { name: message.sender.name },
              text: message.message,
            },
          ];
        });
      }
    },
    onError(err) {
      console.error("Subscription error:", err);
    },
  });
  const addRoom = api.user.addRoom.useMutation();
  const sendMessageMutation = api.room.sendMessage.useMutation();
  const addMessage = api.message.addMessage.useMutation();

  return (
    <div className="grid md:grid-cols-5">
      <div className="flex h-screen flex-col border-2 md:col-span-4">
        <div className="flex-1 overflow-y-scroll">
          <ul className="flex flex-col p-4">
            {messages?.map((m) => {
              return (
                <MessageItem key={m.id} message={m} session={session || null} />
              );
            })}
          </ul>
        </div>
        <form
          className="flex"
          onSubmit={(e) => {
            e.preventDefault();

            sendMessageMutation.mutate({
              roomId,
              userId,
              message,
            });
            addMessage.mutate({ userId, text: message, roomId });
            setMessage("");
          }}
        >
          <textarea
            className="black w-full rounded-md border border-gray-700 bg-gray-50 p-2.5 text-gray-700"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What do you want to say"
          />

          <button className="flex-1 bg-gray-900 p-2.5 text-white" type="submit">
            Send message
          </button>
        </form>
      </div>
      <div className="m-3 flex flex-col">
        <span className={"mt-10 mb-5 ml-1 font-bold"}>Groups</span>
        {roomsQuery?.data?.map((room) => {
          return (
            <div
              key={room.id}
              className={"m-1 flex cursor-pointer flex-row"}
              style={{
                backgroundColor: room.id === roomId ? "red" : "white",
              }}
              onClick={() => {
                setRoomId(room.id);
                addRoom.mutate({ userId, roomId: room.id });
                setIsRoomChanged(!isRoomChanged);
              }}
            >
              <span className={"ml-1 mt-1 text-sm font-medium"}>
                {room.name}
              </span>
            </div>
          );
        })}
        <div className="m-3 flex flex-col">
          <span className={"mt-10 mb-5 ml-1 font-bold"}>People</span>
          {roomQuery?.data?.users.map((user) => {
            return (
              <div key={user.id} className={"m-1 flex cursor-pointer flex-row"}>
                <Image
                  src={avatarImage}
                  alt="avatar"
                  width={30}
                  height={30}
                  style={{ borderRadius: 15 }}
                />
                <span className={"ml-1 mt-1 text-sm font-medium"}>
                  {user.name}
                  {user.name === session?.user?.name ? (
                    <span className={"ml-1 text-blue-400"}>(You)</span>
                  ) : undefined}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default RoomPage;
