import { Session } from "next-auth";
import {useSession, signOut, signIn} from "next-auth/react";
import { useRouter } from "next/router";
import { useState} from "react";
import { Message } from "../../server/api/routers/room";
import {api} from "../../utils/api";

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
    message.sender.name === session?.user?.name
      ? baseStyles
      : baseStyles.concat(" self-end bg-gray-700 text-white");

  return (
    <li className={liStyles}>
      <div className="flex">
        <time>
          {message.sentAt.toLocaleTimeString("en-AU", {
            timeStyle: "short",
          })}{" "}
          - {message.sender.name}
        </time>
      </div>
      {message.message}
    </li>
  );
}

function RoomPage() {
  const router = useRouter();
  const roomId = router.query.roomId as string;
  const { data: session } = useSession();

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
    api.room.onSendMessage.useSubscription({roomId}, {
        onData(message) {
            setMessages((m) => {
                return [...m, message];
            });
        },
        onError(err) {
            console.error('Subscription error:', err);
        },
    });
    api.room.onCloseConnection.useSubscription(undefined, {
        onData(message) {
            setMessages((m) => {
                return [...m, message];
            });
        },
        onError(err) {
            console.error('Subscription error:', err);
        },
    });

  const sendMessageMutation = api.room.sendMessage.useMutation();
  const closeConnectionMutation = api.room.closeConnection.useMutation();

  const leaveChat = () => {
      closeConnectionMutation.mutate({ roomId })
      signIn();
  };
  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1">
        <ul className="flex flex-col p-4">
          {messages.map((m) => {
            return <MessageItem key={m.id} message={m} session={session || null} />;
          })}
        </ul>
      </div>
        <button className={"w-5/6 bg-blue-900"} onClick={() => leaveChat()}>
            Leave chat
        </button>
      <form
        className="flex"
        onSubmit={(e) => {
          e.preventDefault();

          sendMessageMutation.mutate({
            roomId,
            message,
          });

          setMessage("");
        }}
      >
        <textarea
          className="black p-2.5 w-full text-gray-700 bg-gray-50 rounded-md border border-gray-700"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="What do you want to say"
        />

        <button className="flex-1 text-white bg-gray-900 p-2.5" type="submit">
          Send message
        </button>
      </form>
    </div>
  );
}

export default RoomPage;
