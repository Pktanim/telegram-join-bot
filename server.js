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
// POLLING ERROR
// =====================================================

bot.on("polling_error", (error) => {

    console.error(
        "❌ Telegram polling error:",
        error.message
    );

});


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


        // Normal member
        if (
            status === "member" ||
            status === "administrator" ||
            status === "creator"
        ) {

            return true;
        }


        // Restricted member
        if (
            status === "restricted" &&
            member.is_member === true
        ) {

            return true;
        }


        // Left / Kicked / Other
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
// GET CURRENT STEP
//
// Channel 1 → Channel 2 → Channel 3
//
// প্রথম যে Channel-এ Join করা হয়নি,
// verification সেখানেই থামবে।
// =====================================================

async function getCurrentStep(userId) {

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


        if (!joined) {

            return {
                completed: false,
                index: i,
                channel: CHANNELS[i]
            };
        }
    }


    // সব Channel Join করা হয়েছে
    return {
        completed: true,
        index: CHANNELS.length,
        channel: null
    };
}


// =====================================================
// SHOW JOIN PAGE
// =====================================================

async function showJoinPage(
    chatId,
    userId
) {

    try {

        const step =
            await getCurrentStep(userId);


        // =================================================
        // ALL 3 CHANNELS COMPLETED
        // =================================================

        if (step.completed) {

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

        const channel =
            step.channel;

        const channelNumber =
            step.index + 1;


        // =================================================
        // JOIN + CHECK BUTTON
        // =================================================

        const keyboard = [

            [
                {
                    text:
                        `📢 Join Telegram Channel ${channelNumber}`,

                    url:
                        `https://t.me/${channel.username.replace("@", "")}`
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


        let message =
            "🔒 *৩টি Telegram Channel-এ Join হতে হবে।*\n\n";


        // =================================================
        // CHANNEL 1
        // =================================================

        if (step.index === 0) {

            message +=

                "❌ *Telegram Channel 1*\n" +
                "আপনি এখনো Telegram Channel 1-এ Join করেননি।\n\n" +

                "👉 আগে Telegram Channel 1-এ Join করুন।\n\n" +

                "Join করার পর নিচের *Check Membership* button চাপুন।";
        }


        // =================================================
        // CHANNEL 2
        // =================================================

        else if (step.index === 1) {

            message +=

                "✅ *Telegram Channel 1*\n" +
                "আপনি Telegram Channel 1-এ Join করেছেন।\n\n" +

                "❌ *Telegram Channel 2*\n" +
                "আপনি এখনো Telegram Channel 2-এ Join করেননি।\n\n" +

                "👉 এখন Telegram Channel 2-এ Join করুন।\n\n" +

                "Join করার পর নিচের *Check Membership* button চাপুন।";
        }


        // =================================================
        // CHANNEL 3
        // =================================================

        else if (step.index === 2) {

            message +=

                "✅ *Telegram Channel 1*\n" +
                "আপনি Telegram Channel 1-এ Join করেছেন।\n\n" +

                "✅ *Telegram Channel 2*\n" +
                "আপনি Telegram Channel 2-এ Join করেছেন।\n\n" +

                "❌ *Telegram Channel 3*\n" +
                "আপনি এখনো Telegram Channel 3-এ Join করেননি।\n\n" +

                "👉 এখন Telegram Channel 3-এ Join করুন।\n\n" +

                "Join করার পর নিচের *Check Membership* button চাপুন।";
        }


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
            "❌ SHOW JOIN PAGE ERROR:",
            error.message
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
                "❌ START ERROR:",
                error.message
            );

            await bot.sendMessage(
                chatId,

                "❌ Something went wrong.\n\n" +
                "আবার চেষ্টা করুন।"
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

            // Button loading
            await bot.answerCallbackQuery(
                query.id,
                {
                    text:
                        "🔍 Membership checking..."
                }
            );


            // =================================================
            // GET CURRENT STEP
            // =================================================

            const step =
                await getCurrentStep(
                    userId
                );


            // =================================================
            // ALL 3 COMPLETED
            // =================================================

            if (step.completed) {

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

            const channel =
                step.channel;

            const channelNumber =
                step.index + 1;


            // =================================================
            // CHECK CURRENT CHANNEL AGAIN
            // =================================================

            const joined =
                await checkChannelMember(
                    userId,
                    channel.username
                );


            // =================================================
            // NOT JOINED
            // =================================================

            if (!joined) {

                let message =
                    "🔒 *৩টি Telegram Channel-এ Join হতে হবে।*\n\n";


                // Channel 1
                if (
                    channelNumber === 1
                ) {

                    message +=

                        "❌ *Telegram Channel 1*\n" +
                        "আপনি এখনো Telegram Channel 1-এ Join করেননি।\n\n" +

                        "👉 আগে Telegram Channel 1-এ Join করুন।\n\n" +

                        "তারপর আবার *Check Membership* চাপুন।";
                }


                // Channel 2
                else if (
                    channelNumber === 2
                ) {

                    message +=

                        "✅ *Telegram Channel 1*\n" +
                        "আপনি Telegram Channel 1-এ Join করেছেন।\n\n" +

                        "❌ *Telegram Channel 2*\n" +
                        "আপনি এখনো Telegram Channel 2-এ Join করেননি।\n\n" +

                        "👉 আগে Telegram Channel 2-এ Join করুন।\n\n" +

                        "তারপর আবার *Check Membership* চাপুন।";
                }


                // Channel 3
                else if (
                    channelNumber === 3
                ) {

                    message +=

                        "✅ *Telegram Channel 1*\n" +
                        "আপনি Telegram Channel 1-এ Join করেছেন।\n\n" +

                        "✅ *Telegram Channel 2*\n" +
                        "আপনি Telegram Channel 2-এ Join করেছেন।\n\n" +

                        "❌ *Telegram Channel 3*\n" +
                        "আপনি এখনো Telegram Channel 3-এ Join করেননি।\n\n" +

                        "👉 আগে Telegram Channel 3-এ Join করুন।\n\n" +

                        "তারপর আবার *Check Membership* চাপুন।";
                }


                await bot.sendMessage(
                    chatId,
                    message,
                    {
                        parse_mode:
                            "Markdown"
                    }
                );


                // Current channel button আবার দেখানো
                await showJoinPage(
                    chatId,
                    userId
                );

                return;
            }


            // =================================================
            // CURRENT CHANNEL JOINED
            // =================================================

            let verifiedMessage =
                "🔒 *৩টি Telegram Channel-এ Join হতে হবে।*\n\n";


            // Channel 1 verified
            if (
                channelNumber === 1
            ) {

                verifiedMessage +=

                    "✅ *Telegram Channel 1*\n" +
                    "আপনি Telegram Channel 1-এ Join করেছেন।\n\n" +

                    "👉 এখন Telegram Channel 2-এ Join করুন।";
            }


            // Channel 2 verified
            else if (
                channelNumber === 2
            ) {

                verifiedMessage +=

                    "✅ *Telegram Channel 1*\n" +
                    "আপনি Telegram Channel 1-এ Join করেছেন।\n\n" +

                    "✅ *Telegram Channel 2*\n" +
                    "আপনি Telegram Channel 2-এ Join করেছেন।\n\n" +

                    "👉 এখন Telegram Channel 3-এ Join করুন।";
            }


            // Channel 3 verified
            else if (
                channelNumber === 3
            ) {

                verifiedMessage +=

                    "✅ *Telegram Channel 1*\n" +
                    "আপনি Telegram Channel 1-এ Join করেছেন।\n\n" +

                    "✅ *Telegram Channel 2*\n" +
                    "আপনি Telegram Channel 2-এ Join করেছেন।\n\n" +

                    "✅ *Telegram Channel 3*\n" +
                    "আপনি Telegram Channel 3-এ Join করেছেন।\n\n" +

                    "🎉 *All Channels Verified!*\n\n" +

                    "✅ *Access Granted*";
            }


            await bot.sendMessage(
                chatId,
                verifiedMessage,
                {
                    parse_mode:
                        "Markdown"
                }
            );


            // =================================================
            // SHOW NEXT CHANNEL
            // =================================================

            await showJoinPage(
                chatId,
                userId
            );

        } catch (error) {

            console.error(
                "❌ CHECK MEMBERSHIP ERROR:",
                error.message
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
