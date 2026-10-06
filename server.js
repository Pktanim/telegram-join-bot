const express = require("express");
const TelegramBot = require("node-telegram-bot-api");

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 10000;
const BOT_TOKEN = process.env.BOT_TOKEN;


// =====================================================
// REQUIRED TELEGRAM CHANNELS
// =====================================================

const CHANNELS = [
    {
        username: "@glarybox",
        name: "Channel 1"
    },
    {
        username: "@tripsgame",
        name: "Channel 2"
    },
    {
        username: "@txviw",
        name: "Channel 3"
    }
];


// =====================================================
// CHECK BOT TOKEN
// =====================================================

if (!BOT_TOKEN) {
    console.error("❌ BOT_TOKEN is missing!");
    process.exit(1);
}


// =====================================================
// START TELEGRAM BOT
// =====================================================

const bot = new TelegramBot(
    BOT_TOKEN,
    {
        polling: true
    }
);

console.log("🤖 Bot started successfully");


// =====================================================
// CHECK ONE CHANNEL MEMBERSHIP
// =====================================================

async function checkChannelMember(
    userId,
    channelUsername
) {

    try {

        const member =
            await bot.getChatMember(
                channelUsername,
                userId
            );

        if (!member) {
            return false;
        }

        const status =
            member.status;

        if (
            status === "member" ||
            status === "administrator" ||
            status === "creator"
        ) {
            return true;
        }

        if (
            status === "restricted" &&
            member.is_member === true
        ) {
            return true;
        }

        return false;

    } catch (error) {

        console.error(
            `Membership check error for ${channelUsername}:`,
            error.message
        );

        return false;
    }
}


// =====================================================
// CHECK ALL 3 CHANNELS
// =====================================================

async function checkAllChannels(userId) {

    const results = [];

    for (const channel of CHANNELS) {

        const joined =
            await checkChannelMember(
                userId,
                channel.username
            );

        results.push({
            username: channel.username,
            name: channel.name,
            joined: joined
        });
    }

    return results;
}


// =====================================================
// SHOW JOIN BUTTONS
// =====================================================

async function showJoinPage(chatId) {

    const keyboard = [];

    for (const channel of CHANNELS) {

        keyboard.push([
            {
                text:
                    `📢 Join ${channel.name}`,

                url:
                    `https://t.me/${channel.username.replace("@", "")}`
            }
        ]);
    }

    keyboard.push([
        {
            text:
                "✅ Check Membership",

            callback_data:
                "CHECK_MEMBERSHIP"
        }
    ]);

    await bot.sendMessage(
        chatId,

        "🔒 *Access Locked*\n\n" +

        "এই Bot-এর Access পেতে হলে " +
        "নিচের ৩টি Telegram Channel-এ Join করতে হবে।\n\n" +

        "১️⃣ Channel 1\n" +
        "২️⃣ Channel 2\n" +
        "৩️⃣ Channel 3\n\n" +

        "তিনটি Channel-এই Join করার পর " +
        "নিচের *Check Membership* button চাপুন।",

        {
            parse_mode: "Markdown",

            reply_markup: {
                inline_keyboard: keyboard
            }
        }
    );
}


// =====================================================
// /START COMMAND
// =====================================================

bot.onText(
    /^\/start(?:\s+.*)?$/,

    async (msg) => {

        const chatId =
            msg.chat.id;

        const userId =
            msg.from.id;

        try {

            const results =
                await checkAllChannels(
                    userId
                );

            const allJoined =
                results.every(
                    channel =>
                        channel.joined
                );

            if (allJoined) {

                await bot.sendMessage(
                    chatId,

                    "🎉 *Verified Successfully!*\n\n" +

                    "আপনি তিনটি Channel-এই Joined আছেন।\n\n" +

                    "✅ *Access Granted*",

                    {
                        parse_mode: "Markdown"
                    }
                );

                return;
            }

            await showJoinPage(
                chatId
            );

        } catch (error) {

            console.error(
                "START ERROR:",
                error
            );

            await bot.sendMessage(
                chatId,

                "❌ Membership check করা যাচ্ছে না।\n" +
                "কিছুক্ষণ পরে আবার চেষ্টা করুন।"
            );
        }
    }
);


// =====================================================
// CHECK MEMBERSHIP BUTTON
// =====================================================

bot.on(
    "callback_query",

    async (query) => {

        if (
            query.data !==
            "CHECK_MEMBERSHIP"
        ) {
            return;
        }

        const userId =
            query.from.id;

        const chatId =
            query.message.chat.id;

        try {

            await bot.answerCallbackQuery(
                query.id,
                {
                    text: "Checking..."
                }
            );

            const results =
                await checkAllChannels(
                    userId
                );

            const allJoined =
                results.every(
                    channel =>
                        channel.joined
                );

            if (allJoined) {

                await bot.sendMessage(
                    chatId,

                    "🎉 *Verification Successful!*\n\n" +

                    "তিনটি Telegram Channel-এর " +
                    "Membership successfully verified.\n\n" +

                    "✅ *Access Granted*",

                    {
                        parse_mode: "Markdown"
                    }
                );

                return;
            }


            // =================================================
            // MEMBERSHIP STATUS
            // =================================================

            let statusMessage =
                "❌ *Membership Incomplete*\n\n";

            results.forEach(
                (channel) => {

                    if (channel.joined) {

                        statusMessage +=
                            `✅ ${channel.username} — Joined\n`;

                    } else {

                        statusMessage +=
                            `❌ ${channel.username} — Not Joined\n`;
                    }
                }
            );

            statusMessage +=
                "\n⚠️ তিনটি Channel-এই Join করতে হবে।";


            await bot.sendMessage(
                chatId,

                statusMessage,

                {
                    parse_mode: "Markdown"
                }
            );


            // Show Join buttons again
            await showJoinPage(
                chatId
            );

        } catch (error) {

            console.error(
                "CHECK MEMBERSHIP ERROR:",
                error
            );

            await bot.sendMessage(
                chatId,

                "❌ Membership checking failed.\n" +
                "আবার চেষ্টা করুন।"
            );
        }
    }
);


// =====================================================
// HOME ROUTE
// =====================================================

app.get(
    "/",

    (req, res) => {

        res.send(
            "Telegram Mandatory Join Bot is running ✅"
        );
    }
);


// =====================================================
// HEALTH CHECK
// =====================================================

app.get(
    "/health",

    (req, res) => {

        res.json({

            status: "ok",

            bot: "running",

            channels:
                CHANNELS.map(
                    channel =>
                        channel.username
                )
        });
    }
);


// =====================================================
// START SERVER
// =====================================================

app.listen(
    PORT,

    () => {

        console.log(
            `🌐 Server running on port ${PORT}`
        );
    }
);
