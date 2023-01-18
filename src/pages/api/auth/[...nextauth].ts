import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

// Prisma adapter for NextAuth, optional and can be removed
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "../../../server/db";
import { env } from "../../../server/env";

export const authOptions: NextAuthOptions = {
  // Include user.id on session
  // callbacks: {
  //   session({ session, user }) {
  //     if (session.user) {
  //       session.user.id = user.id;
  //     }
  //     return session;
  //   },
  // },
  // Configure one or more authentication providers
  adapter: PrismaAdapter(prisma),
  providers: [
    // ...add more providers here
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: {
          label: "Username",
          type: "text",
          placeholder: "username is required",
        },
        email: {
          label: "Email",
          type: "text",
          placeholder: "email is required",
        },
      },
      async authorize(credentials, _req) {
        const { nanoid } = await import("nanoid");
        const user = await prisma.user.findFirst({
          where: { name: credentials?.username, email: credentials?.email },
        });
        if (!user) {
          if (credentials?.username && credentials?.email) {
            return await prisma.user.create({
              data: {
                id: nanoid(),
                name: credentials?.username,
                email: credentials?.email,
              },
            });
          } else {
            return false;
          }
        } else {
          return user;
        }
      },
    }),
  ],
  secret: env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
};

export default NextAuth(authOptions);
