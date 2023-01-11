// eslint-disable-next-line @typescript-eslint/no-var-requires
const {z} = require("zod");
/**
 * This file is included in `/next.config.js` which ensures the app isn't built with invalid env vars.
 * It has to be a `.js`-file to be imported there.
 */
const envSchema = z.object({
    // DATABASE_URL: z.string().url(),
    // NODE_ENV: z.enum(["development", "test", "production"]),
    NEXTAUTH_SECRET: z.string(),
    // NEXTAUTH_URL: z.string().url(),
    // DISCORD_CLIENT_ID: z.string(),
    // DISCORD_CLIENT_SECRET: z.string(),
});
const env = envSchema.safeParse(process.env);

const formatErrors = (
    /** @type {import('zod').ZodFormattedError<Map<string,string>,string>} */
    errors
) =>
    Object.entries(errors)
        .map(([name, value]) => {
            if (value && "_errors" in value)
                return `${name}: ${value._errors.join(", ")}\n`;
        })
        .filter(Boolean);

if (!env.success) {
    console.error(
        "❌ Invalid environment variables:\n",
        ...formatErrors(env.error.format())
    );
    process.exit(1);
}

module.exports.env = env.data;
