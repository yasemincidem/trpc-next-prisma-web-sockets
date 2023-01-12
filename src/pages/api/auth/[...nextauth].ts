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
        username: { label: "Username", type: "text", placeholder: "username" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, _req) {
        const dbUser = await prisma.user.findUnique({
          where: {
            email: credentials?.username,
          },
        });
        return dbUser;
      },
    }),
  ],
  secret: env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
};

export default NextAuth(authOptions);
