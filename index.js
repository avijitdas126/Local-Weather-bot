const { Telegraf } = require("telegraf");
const { message } = require("telegraf/filters");
const express = require("express");
require("dotenv").config();
const { Telbot, Tel } = require('./modul'); // Import your database models
const fetch = require("node-fetch");

const app = express();
const bot = new Telegraf(process.env.BOT_TOKEN);
let keepAliveInterval = 25 * 60 * 1000; // Default to 25 minutes
let lastActivityTime = Date.now(); // Tracks the last time the bot was active
let intervalID;

// Enable parsing of JSON requests for Express
app.use(express.json());

// Array of OpenWeather tokens for API calls
let token = [process.env.OpenWeather_Token0, process.env.OpenWeather_Token1];

// Function to generate a random token
function random() {
  return Math.floor(Math.random() * token.length);
}

// Utility function to validate URLs
async function isValidUrl(url) {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (err) {
    console.error(`Invalid URL: ${url}`, err);
    return false;
  }
}

// Set the webhook URL
const webhookUrl = `${process.env.SERVER}/webhook`;

// Function to count user interactions
async function count(id) {
  try {
    const user = await Telbot.findOne({ userid: id });
    if (user) {
      const newCount = (user.count || 0) + 1;
      await Telbot.updateOne({ userid: id }, { $set: { count: newCount } });
      console.log("Count updated successfully:", newCount);
    } else {
      console.log("User not found");
    }
  } catch (error) {
    console.error("Error occurred:", error);
  }
}

// Function to send a weather photo
async function sendWeatherPhoto(chatId, imgUrl, caption) {
  try {
    const isValid = await isValidUrl(imgUrl);
    if (!isValid) throw new Error("Invalid image URL");
    await bot.telegram.sendPhoto(chatId, { url: imgUrl }, { caption });
  } catch (err) {
    console.error("Error sending photo:", err.message);
   // await bot.telegram.sendMessage(chatId, "We encountered an error sending the weather image. Please try again.");
 await bot.telegram.sendMessage(chatId,caption);
  }
}

// Start command
bot.start(async (ctx) => {
  ctx.reply("Welcome to our service! We are excited to have you on board.");

  const userData = {
    username: ctx.update.message.from.username,
    name: `${ctx.update.message.from.first_name} ${ctx.update.message.from.last_name}`,
    userid: ctx.update.message.from.id,
  };

  try {
    await Telbot.findOneAndUpdate(
      { userid: userData.userid },
      userData,
      { new: true, upsert: true }
    );
    console.log("User inserted/updated successfully:");
    count(ctx.update.message.from.id);
  } catch (err) {
    console.error("Error inserting/updating user:", err.message);
  }

  ctx.reply(
    "Bot Commands:\n\n1.\t /now -\t\t Know your local weather.\n2. /weather [City] -\t Weather of another city.\n3. /setlocal [Your City] -\t Set your local city."
  );
});

// Handle /now command
bot.hears('/now', async (ctx) => {
  let city = await Tel.find({ userid: ctx.update.message.from.id });

  if (city.length !== 0) {
    let { message_id: msgid } = await ctx.replyWithSticker('CAACAgIAAxkBAAIBmmbmtyxl__PM1i4wsKcHKljraZGsAAIwFAACV03ASHMUDFXjRXH1NgQ');
    city = city[0].local.toLowerCase();
    let data = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${token[random()]}&units=metric`);
    data = await data.json();

    if (data.cod === 200) {
      let imgurl = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
      let { temp,feels_like,temp_max,temp_min } = data.main;
      let { speed: wind } = data.wind;
      let { description: weather } = data.weather[0];
      await ctx.deleteMessage(msgid);

      const caption = `Name: ${data.name}\nTemperature: ${temp}°C\nWind: ${wind} kph\nWeather: ${weather}\nHumidity: ${data.main.humidity}%\nMinimum Temperature:${temp_min}°C\nMaximum Temperature:${temp_max}°C\nFeels Like:${feels_like}°C \nCountry: ${data.sys.country}`;
      await sendWeatherPhoto(ctx.chat.id, imgurl, caption);
    } else {
      await ctx.deleteMessage(msgid);
      ctx.reply(`${data.message}. Set your local city using /setlocal [City]`);
    }
  } else {
    ctx.reply("First, set your local city using /setlocal [City]");
  }
});

// Help command
bot.help((ctx) => {
  count(ctx.update.message.from.id);
  ctx.reply(
    "Bot Commands:\n\n1.\t /now -\t\t Know your local weather.\n2. /weather [City] -\t Weather of another city.\n3. /setlocal [City] -\t Set your local city."
  );
});

// Handle text messages
bot.on(message("text"), async (ctx) => {
  let text = ctx.update.message.text;
  if (text.startsWith("/setlocal")) {
    count(ctx.update.message.from.id);
    let city = text.split("/setlocal ")[1];
    if (city) {
      let id = ctx.update.message.from.id;
      let obj = { userid: id, local: city };
      try {
        await Tel.findOneAndUpdate({ userid: id }, obj, { new: true, upsert: true });
        ctx.reply("Your local city has been set successfully. Use /now to check the weather.");
      } catch (err) {
        ctx.reply("Unable to set your local city. Please try again.");
        console.error("Error:", err.message);
      }
    } else {
      ctx.reply("Use /setlocal [City] to set your city.\nExample: /setlocal Tokyo");
    }
  } else if (text.startsWith("/weather")) {
    count(ctx.update.message.from.id);
    let city = text.split("/weather ")[1];
    if (city) {
      let data = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${token[random()]}&units=metric`);
      data = await data.json();

      if (data.cod === 200) {
        let imgurl = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
        let { temp,feels_like,temp_max,temp_min } = data.main;
        let { speed: wind } = data.wind;
        let { description: weather } = data.weather[0];

        const caption = `Name: ${data.name}\nTemperature: ${temp}°C\nWind: ${wind} kph\nWeather: ${weather}\nHumidity: ${data.main.humidity}%\nMinimum Temperature:${temp_min}°C\nMaximum Temperature:${temp_max}°C\nFeels Like:${feels_like}°C \nCountry: ${data.sys.country}`;
        await sendWeatherPhoto(ctx.chat.id, imgurl, caption);
      } else {
        ctx.reply(`${data.message}. Use /weather [City] for other cities.`);
      }
    } else {
      ctx.reply("Use /weather [City] for other cities.\nExample: /weather Tokyo");
    }
  } else {
    count(ctx.update.message.from.id);
    ctx.reply("Available Commands:\n1.\t /now -\t\t Know your local weather.\n2. /weather [City] -\t Weather of another city.\n3. /setlocal [City] -\t Set your local city.");
  }
});

// Webhook endpoint
app.post("/webhook", (req, res) => {
  try {
    bot.handleUpdate(req.body);
    lastActivityTime = Date.now(); // Update last activity time
    res.sendStatus(200);
  } catch (error) {
    console.error("Error handling update:", error);
    res.sendStatus(500);
  }
});

// Basic endpoint to check if the bot is running
app.get("/", (req, res) => {
  res.send("Bot is running!");
});

// Set the webhook with retry logic
async function setWebhookWithRetry(url) {
  const maxRetries = 5;
  let attempts = 0;

  while (attempts < maxRetries) {
    try {
      await bot.telegram.setWebhook(url);
      console.log(`Webhook set to: ${url}`);
      break; // If successful, exit the loop
    } catch (error) {
      if (error.code === 429) {
        const retryAfter = error.parameters.retry_after || 1; // Extract retry time or default to 1 second
        console.log(`Rate limit hit, retrying after ${retryAfter} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000)); // Wait before retrying
      } else {
        console.error("Error setting webhook:", error);
        break; // Exit loop for other errors
      }
    }
    attempts++;
  }
}

// Start the server
const PORT = process.env.PORT || 9000;
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await setWebhookWithRetry(webhookUrl);
});

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
