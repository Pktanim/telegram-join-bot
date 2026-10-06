const express = require("express");
const TelegramBot = require("node-telegram-bot-api");

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 10000;
const BOT_TOKEN = process.env.BOT_TOKEN;

// REQUIRED TELEGRAM CHANNELS
const CHANNELS = [
    {
        username: "@tripsgame",
        name: "Telegram Channel 1"
    },
    {
        username: "@txviw",
        name: "Telegram Channel 2"
    },
    {
        username: "@glarybox",
        name: "Telegram Channel 3"
    }
];

// CHECK BOT TOKEN
if (!BOT_TOKEN) {
    console.error("❌ BOT_TOKEN is missing!");
    process.exit(1);
}

// START TELEGRAM BOT
const bot = new TelegramBot(
    BOT_TOKEN,
    {
        polling: true
    }
);

console.log("🤖 Bot started successfully");

// POLLING ERROR
bot.on("polling_error", (error) => {
    console.error(
        "❌ Telegram polling error:",
        error.message
    );
});

// CHECK ONE CHANNEL MEMBERSHIP
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

// GET CURRENT STEP
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

    return {
        completed: true,
        index: CHANNELS.length,
        channel: null
    };
}

// CREATE CURRENT MESSAGE
function createJoinMessage(step) {
    let message =
        "🔥 *ভাইরাল সব ভিডিও দেখতে হলে তিনটি Telegram চ্যানেলে Join করতে হবে।*\n\n";

    if (step.index === 0) {
        message +=
            "❌ *Telegram Channel 1*\n" +
            "আপনি এখনো Telegram Channel 1-এ Join করেননি।\n\n" +
            "👉 আগে Telegram Channel 1-এ Join করুন।\n\n" +
            "Join করার পর নিচের *Check Membership* button চাপুন.";
    } else if (step.index === 1) {
        message +=
            "✅ *Telegram Channel 1*\n" +
            "আপনি Telegram Channel 1-এ Join করেছেন।\n\n" +
            "❌ *Telegram Channel 2*\n" +
            "আপনি এখনো Telegram Channel 2-এ Join করেননি।\n\n" +
            "👉 এখন Telegram Channel 2-এ Join করুন।\n\n" +
            "Join করার পর নিচের *Check Membership* button চাপুন.";
    } else if (step.index === 2) {
        message +=
            "✅ *Telegram Channel 1*\n" +
            "আপনি Telegram Channel 1-এ Join করেছেন।\n\n" +
            "✅ *Telegram Channel 2*\n" +
            "আপনি Telegram Channel 2-এ Join করেছেন।\n\n" +
            "❌ *Telegram Channel 3*\n" +
            "আপনি এখনো Telegram Channel 3-এ Join করেননি।\n\n" +
            "👉 এখন Telegram Channel 3-এ Join করুন।\n\n" +
            "Join করার পর নিচের *Check Membership* button চাপুন.";
    }

    return message;
}

// CREATE KEYBOARD
function createKeyboard(step) {
    const channel =
        step.channel;

    const channelNumber =
        step.index + 1;

    return {
        inline_keyboard: [
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
        ]
    };
}

// SEND CURRENT STEP
async function showJoinPage(
    chatId,
    userId
) {
    try {
        const step =
            await getCurrentStep(
                userId
            );

        if (step.completed) {
            await bot.sendMessage(
                chatId,
                "🔥 *ভাইরাল সব ভিডিও দেখতে হলে তিনটি Telegram চ্যানেলে Join করতে হবে।*\n\n" +
                "✅ *Telegram Channel 1* — Joined\n" +
                "✅ *Telegram Channel 2* — Joined\n" +
                "✅ *Telegram Channel 3* — Joined\n\n" +
                "🎉 *All Channels Verified!*\n\n" +
                "✅ *Access Granted*",
                {
                    parse_mode:
                        "Markdown"
                }
            );
            return;
        }

        const message =
            createJoinMessage(step);

        const keyboard =
            createKeyboard(step);

        await bot.sendMessage(
            chatId,
            message,
            {
                parse_mode:
                    "Markdown",
                reply_markup:
                    keyboard
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

// /START COMMAND
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

// CHECK MEMBERSHIP
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
                        "🔍 Checking Membership..."
                }
            );

            const step =
                await getCurrentStep(
                    userId
                );

            if (step.completed) {
                await bot.editMessageText(
                    "🔥 *ভাইরাল সব ভিডিও দেখতে হলে তিনটি Telegram চ্যানেলে Join করতে হবে।*\n\n" +
                    "✅ *Telegram Channel 1* — Joined\n" +
                    "✅ *Telegram Channel 2* — Joined\n" +
                    "✅ *Telegram Channel 3* — Joined\n\n" +
                    "🎉 *All Channels Verified!*\n\n" +
                    "✅ *Access Granted*",
                    {
                        chat_id:
                            chatId,
                        message_id:
                            query.message.message_id,
                        parse_mode:
                            "Markdown"
                    }
                );
                return;
            }

            const currentChannel =
                step.channel;

            const channelNumber =
                step.index + 1;

            const joined =
                await checkChannelMember(
                    userId,
                    currentChannel.username
                );

            if (!joined) {
                const message =
                    createJoinMessage(step);

                const keyboard =
                    createKeyboard(step);

                await bot.editMessageText(
                    message,
                    {
                        chat_id:
                            chatId,
                        message_id:
                            query.message.message_id,
                        parse_mode:
                            "Markdown",
                        reply_markup:
                            keyboard
                    }
                );

                return;
            }

            const nextStep =
                await getCurrentStep(
                    userId
                );

            if (nextStep.completed) {
                await bot.editMessageText(
                    "🔥 *ভাইরাল সব ভিডিও দেখতে হলে তিনটি Telegram চ্যানেলে Join করতে হবে।*\n\n" +
                    "✅ *Telegram Channel 1* — Joined\n" +
                    "✅ *Telegram Channel 2* — Joined\n" +
                    "✅ *Telegram Channel 3* — Joined\n\n" +
                    "🎉 *All Channels Verified!*\n\n" +
                    "✅ *Access Granted*",
                    {
                        chat_id:
                            chatId,
                        message_id:
                            query.message.message_id,
                        parse_mode:
                            "Markdown"
                    }
                );
                return;
            }

            const nextMessage =
                createJoinMessage(
                    nextStep
                );

            const nextKeyboard =
                createKeyboard(
                    nextStep
                );

            await bot.editMessageText(
                nextMessage,
                {
                    chat_id:
                        chatId,
                    message_id:
                        query.message.message_id,
                    parse_mode:
                        "Markdown",
                    reply_markup:
                        nextKeyboard
                }
            );

        } catch (error) {
            console.error(
                "❌ CHECK MEMBERSHIP ERROR:",
                error.message
            );

            try {
                await bot.answerCallbackQuery(
                    query.id,
                    {
                        text:
                            "❌ Membership checking failed. আবার চেষ্টা করুন।",
                        show_alert:
                            true
                    }
                );
            } catch (callbackError) {
                console.error(
                    "Callback error:",
                    callbackError.message
                );
            }
        }
    }
);

// HOME ROUTE
app.get(
    "/",
    (req, res) => {
        res.send(
            "Telegram Mandatory Join Bot is running ✅"
        );
    }
);

// HEALTH CHECK
app.get(
    "/health",
    (req, res) => {
        res.json({
            status:
                "ok",
            bot:
                "running",
            channels:
                CHANNELS.map(
                    channel =>
                        channel.username
                )
        });
    }
);

// START SERVER
app.listen(
    PORT,
    () => {
        console.log(
            `🌐 Server running on port ${PORT}`
        );
    }
);
