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
        name: "Telegram Channel 1"
    },
    {
        username: "@tripsgame",
        name: "Telegram Channel 2"
    },
    {
        username: "@txviw",
        name: "Telegram Channel 3"
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

        const status = member.status;

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
// CHECK CHANNELS IN ORDER
// =====================================================

async function getChannelStatus(userId) {

    const results = [];

    for (
        let i = 0;
        i < CHANNELS.length;
        i++
    ) {

        const joined =
            await checkChannelMember(
                userId,
                CHANNELS[i].username
            );

        results.push({
            index: i,
            number: i + 1,
            username: CHANNELS[i].username,
            name: CHANNELS[i].name,
            joined: joined
        });

        /*
         * গুরুত্বপূর্ণ:
         * প্রথম যে Channel-এ Join করা হয়নি
         * সেখানেই verification থামবে।
         *
         * এর ফলে Channel 1 Join না করলে
         * Channel 2 বা 3 সামনে আসবে না।
         */

        if (!joined) {
            break;
        }
    }

    return results;
}


// =====================================================
// SEND CURRENT STEP
// =====================================================

async function showJoinPage(
    chatId,
    userId
) {

    try {

        const results =
            await getChannelStatus(userId);


        // =================================================
        // ALL THREE JOINED
        // =================================================

        if (
            results.length ===
            CHANNELS.length &&
            results.every(
                channel => channel.joined
            )
        ) {

            await bot.sendMessage(
                chatId,

                "🔒 *৩টি Telegram Channel-এ Join হতে হবে।*\n\n" +

                "✅ Telegram Channel 1 — Joined\n" +
                "✅ Telegram Channel 2 — Joined\n" +
                "✅ Telegram Channel 3 — Joined\n\n" +

                "🎉 *All Channels Verified!*\n\n" +
                "✅ *Access Granted*",

                {
                    parse_mode: "Markdown"
                }
            );

            return;
        }


        // =================================================
        // CURRENT CHANNEL
        // =================================================

        const current =
            results[results.length - 1];


        const channelNumber =
            current.number;


        let message =
            "🔒 *৩টি Telegram Channel-এ Join হতে হবে।*\n\n";


        // =================================================
        // CHANNEL 1
        // =================================================

        if (channelNumber === 1) {

            message +=

                "❌ আপনি এখনো Telegram Channel 1-এ Join করেননি।\n\n" +

                "👉 আগে Telegram Channel 1-এ Join করুন।\n\n" +

                "Join করার পর নিচের *Check Membership* button চাপুন।";
        }


        // =================================================
        // CHANNEL 2
        // =================================================

        else if (channelNumber === 2) {

            message +=

                "✅ Telegram Channel 1-এ Join করেছেন।\n\n" +

                "❌ আপনি এখনো Telegram Channel 2-এ Join করেননি।\n\n" +

                "👉 এখন Telegram Channel 2-এ Join করুন।\n\n" +

                "Join করার পর নিচের *Check Membership* button চাপুন।";
        }


        // =================================================
        // CHANNEL 3
        // =================================================

        else if (channelNumber === 3) {

            message +=

                "✅ Telegram Channel 1-এ Join করেছেন।\n" +
                "✅ Telegram Channel 2-এ Join করেছেন.\n\n" +

                "❌ আপনি এখনো Telegram Channel 3-এ Join করেননি।\n\n" +

                "👉 এখন Telegram Channel 3-এ Join করুন।\n\n" +

                "Join করার পর নিচের *Check Membership* button চাপুন।";
        }


        // =================================================
        // BUTTON
        // =================================================

        const keyboard = [

            [
                {
                    text:
                        `📢 Join Telegram Channel ${channelNumber}`,

                    url:
                        `https://t.me/${current.username.replace("@", "")}`
                }
            ],

            [
                {
                    text:
                        "✅ Check Membership",

                    callback_data:
                        "CHECK_MEMBERSHIP"
                }
            ]

        ];


        await bot.sendMessage(
            chatId,
            message,
            {
                parse_mode: "Markdown",

                reply_markup: {
                    inline_keyboard:
                        keyboard
                }
            }
        );

    } catch (error) {

        console.error(
            "SHOW JOIN PAGE ERROR:",
            error
        );

        await bot.sendMessage(
            chatId,

            "❌ Membership checking করা যাচ্ছে না।\n\n" +
            "কিছুক্ষণ পরে আবার চেষ্টা করুন।"
        );
    }
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

            await showJoinPage(
                chatId,
                userId
            );

        } catch (error) {

            console.error(
                "START ERROR:",
                error
            );

            await bot.sendMessage(
                chatId,

                "❌ Something went wrong.\n" +
                "আবার চেষ্টা করুন।"
            );
        }
    }
);


// =====================================================
// CHECK MEMBERSHIP
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
                    text:
                        "🔍 Membership checking..."
                }
            );


            // =================================================
            // CHECK CURRENT STEP
            // =================================================

            const results =
                await getChannelStatus(
                    userId
                );


            // =================================================
            // ALL THREE JOINED
            // =================================================

            if (
                results.length ===
                CHANNELS.length &&
                results.every(
                    channel => channel.joined
                )
            ) {

                await bot.sendMessage(
                    chatId,

                    "🔒 *৩টি Telegram Channel-এ Join হতে হবে।*\n\n" +

                    "✅ Telegram Channel 1 — Joined\n" +
                    "✅ Telegram Channel 2 — Joined\n" +
                    "✅ Telegram Channel 3 — Joined\n\n" +

                    "🎉 *All Channels Verified!*\n\n" +

                    "✅ *Access Granted*",

                    {
                        parse_mode: "Markdown"
                    }
                );

                return;
            }


            // =================================================
            // CURRENT CHANNEL
            // =================================================

            const current =
                results[results.length - 1];


            const channelNumber =
                current.number;


            // =================================================
            // CURRENT CHANNEL NOT JOINED
            // =================================================

            if (!current.joined) {

                let notJoinedMessage =
                    "🔒 *৩টি Telegram Channel-এ Join হতে হবে।*\n\n";


                // Channel 1
                if (
                    channelNumber === 1
                ) {

                    notJoinedMessage +=

                        "❌ আপনি এখনো Telegram Channel 1-এ Join করেননি।\n\n" +

                        "👉 আগে Telegram Channel 1-এ Join করুন।\n\n" +

                        "তারপর আবার *Check Membership* চাপুন.";
                }


                // Channel 2
                else if (
                    channelNumber === 2
                ) {

                    notJoinedMessage +=

                        "✅ Telegram Channel 1-এ Join করেছেন।\n\n" +

                        "❌ আপনি এখনো Telegram Channel 2-এ Join করেননি।\n\n" +

                        "👉 আগে Telegram Channel 2-এ Join করুন।\n\n" +

                        "তারপর আবার *Check Membership* চাপুন.";
                }


                // Channel 3
                else if (
                    channelNumber === 3
                ) {

                    notJoinedMessage +=

                        "✅ Telegram Channel 1-এ Join করেছেন।\n" +
                        "✅ Telegram Channel 2-এ Join করেছেন।\n\n" +

                        "❌ আপনি এখনো Telegram Channel 3-এ Join করেননি।\n\n" +

                        "👉 আগে Telegram Channel 3-এ Join করুন।\n\n" +

                        "তারপর আবার *Check Membership* চাপুন.";
                }


                await bot.sendMessage(
                    chatId,
                    notJoinedMessage,
                    {
                        parse_mode:
                            "Markdown"
                    }
                );


                // Same current channel button
                await showJoinPage(
                    chatId,
                    userId
                );

                return;
            }


            // =================================================
            // CURRENT CHANNEL JOINED
            // =================================================

            await bot.sendMessage(
                chatId,

                "🎉 *Verification Successful!*\n\n" +

                `✅ Telegram Channel ${channelNumber}-এ Join করেছেন।`,

                {
                    parse_mode:
                        "Markdown"
                }
            );


            // =================================================
            // SHOW NEXT STEP
            // =================================================

            await showJoinPage(
                chatId,
                userId
            );

        } catch (error) {

            console.error(
                "CHECK MEMBERSHIP ERROR:",
                error
            );

            await bot.sendMessage(
                chatId,

                "❌ Membership checking failed.\n\n" +
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
