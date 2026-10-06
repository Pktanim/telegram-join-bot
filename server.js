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
// FIND FIRST CHANNEL THAT USER HAS NOT JOINED
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

    // All channels joined
    return {
        completed: true,
        index: CHANNELS.length,
        channel: null
    };
}


// =====================================================
// SHOW ONLY CURRENT CHANNEL
// =====================================================

async function showCurrentChannel(
    chatId,
    userId
) {

    try {

        const step =
            await getCurrentStep(userId);


        // =================================================
        // ALL CHANNELS COMPLETED
        // =================================================

        if (step.completed) {

            await bot.sendMessage(
                chatId,

                "🎉 *Verification Successful!*\n\n" +
                "আপনি সবগুলো Telegram Channel-এ Join করেছেন।\n\n" +
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


        // Channel number
        const channelNumber =
            step.index + 1;


        // Join button
        const keyboard = [

            [
                {
                    text: `📢 Join Telegram Channel ${channelNumber}`,

                    url:
                        `https://t.me/${channel.username.replace("@", "")}`
                }
            ],

            [
                {
                    text: "✅ Check Membership",

                    callback_data:
                        "CHECK_MEMBERSHIP"
                }
            ]

        ];


        let message = "";


        // =================================================
        // CHANNEL 1
        // =================================================

        if (step.index === 0) {

            message =
                "🔒 *Access Locked*\n\n" +

                "আপনার প্রথমে Telegram Channel 1-এ Join করতে হবে।\n\n" +

                "👇 নিচের Button-এ চাপ দিয়ে Channel 1-এ Join করুন।\n\n" +

                "Join করার পর *Check Membership* চাপুন।";
        }


        // =================================================
        // CHANNEL 2
        // =================================================

        else if (step.index === 1) {

            message =
                "✅ *Channel 1 Verified!*\n\n" +

                "এখন আপনার পরবর্তী ধাপ হলো Telegram Channel 2।\n\n" +

                "👇 আগে Telegram Channel 2-এ Join করুন।\n\n" +

                "Channel 2 Join না করলে পরবর্তী Channel-এ যেতে পারবেন না।\n\n" +

                "Join করার পর *Check Membership* চাপুন।";
        }


        // =================================================
        // CHANNEL 3
        // =================================================

        else if (step.index === 2) {

            message =
                "✅ *Channel 1 Verified!*\n" +
                "✅ *Channel 2 Verified!*\n\n" +

                "🎯 এখন শেষ ধাপ।\n\n" +

                "👇 Telegram Channel 3-এ Join করুন।\n\n" +

                "Channel 3 Join করার পর *Check Membership* চাপুন।";
        }


        await bot.sendMessage(
            chatId,
            message,
            {
                parse_mode: "Markdown",

                reply_markup: {
                    inline_keyboard: keyboard
                }
            }
        );

    } catch (error) {

        console.error(
            "SHOW CHANNEL ERROR:",
            error
        );

        await bot.sendMessage(
            chatId,

            "❌ Membership check করা যাচ্ছে না।\n\n" +
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

            await showCurrentChannel(
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

            // Loading text
            await bot.answerCallbackQuery(
                query.id,
                {
                    text: "🔍 Checking Membership..."
                }
            );


            // Find current step
            const step =
                await getCurrentStep(
                    userId
                );


            // =================================================
            // ALL COMPLETED
            // =================================================

            if (step.completed) {

                await bot.sendMessage(
                    chatId,

                    "🎉 *Verification Successful!*\n\n" +

                    "আপনি সবগুলো Telegram Channel-এ Join করেছেন।\n\n" +

                    "✅ *Access Granted*",

                    {
                        parse_mode: "Markdown"
                    }
                );

                return;
            }


            // =================================================
            // CURRENT CHANNEL NOT JOINED
            // =================================================

            const channel =
                step.channel;


            const channelNumber =
                step.index + 1;


            const joined =
                await checkChannelMember(
                    userId,
                    channel.username
                );


            if (!joined) {

                await bot.sendMessage(
                    chatId,

                    "❌ *Membership Not Found!*\n\n" +

                    `আপনি এখনো Telegram Channel ${channelNumber}-এ Join করেননি।\n\n` +

                    `⚠️ আগে Telegram Channel ${channelNumber}-এ Join করুন।\n\n` +

                    "তারপর আবার *Check Membership* চাপুন।",

                    {
                        parse_mode: "Markdown"
                    }
                );


                // Show same channel again
                await showCurrentChannel(
                    chatId,
                    userId
                );

                return;
            }


            // =================================================
            // CURRENT CHANNEL VERIFIED
            // =================================================

            await bot.sendMessage(
                chatId,

                `✅ *Telegram Channel ${channelNumber} Verified!*\n\n` +

                "Membership successfully verified.",

                {
                    parse_mode: "Markdown"
                }
            );


            // =================================================
            // SHOW NEXT CHANNEL
            // =================================================

            await showCurrentChannel(
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

            channels: CHANNELS.map(
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
