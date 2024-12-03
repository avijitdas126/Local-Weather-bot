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
const tokens = [process.env.OpenWeather_Token0, process.env.OpenWeather_Token1];

// Function to generate a random token
function randomToken() {
  return tokens[Math.floor(Math.random() * tokens.length)];
}

// Set the webhook URL
const webhookUrl = `${process.env.SERVER}/webhook`;

// Function to count user interactions
async function countUserInteraction(id) {
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
    console.error("Error occurred while updating count:", error);
  }
}

// Start command
bot.start(async (ctx) => {
  ctx.reply("Welcome to our service! We are excited to have you on board.");

  const userData = {
    username: ctx.update.message.from.username,
    name: `${ctx.update.message.from.first_name} ${ctx.update.message.from.last_name || ''}`,
    userid: ctx.update.message.from.id,
  };

  try {
    await Telbot.findOneAndUpdate(
      { userid: userData.userid },
      userData,
      { new: true, upsert: true }
    );
    console.log("User inserted/updated successfully.");
    countUserInteraction(ctx.update.message.from.id);
  } catch (err) {
    console.error("Error inserting/updating user:", err.message);
  }

  ctx.reply(
    "Bot Commands:\n\n" +
    "1. /now - Know your local weather.\n" +
    "2. /weather [City] - Get weather of another city.\n" +
    "3. /setlocal [Your City] - Set your local city."
  );
});

// Handle /now command
bot.hears('/now', async (ctx) => {
  const userId = ctx.update.message.from.id;
  countUserInteraction(userId);

  let userCity = await Tel.findOne({ userid: userId });
  if (!userCity) {
    return ctx.reply("First, set your local city using /setlocal [City]");
  }

  userCity = userCity.local.toLowerCase();
  const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${userCity}&appid=${randomToken()}&units=metric`);
  const data = await response.json();

  if (data.cod === 200) {
    const imgurl = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
    const weatherInfo = `
Name: ${data.name}
Temperature: ${data.main.temp}°C
Wind: ${data.wind.speed} kph
Weather: ${data.weather[0].description}
Humidity: ${data.main.humidity}%
Country: ${data.sys.country}`;

    try {
      await bot.telegram.sendPhoto(ctx.chat.id, { url: imgurl }, { caption: weatherInfo });
    } catch (error) {
      console.error("Error sending photo:", error);
      ctx.reply("We are facing some difficulties. Please try again later.");
    }
  } else {
    ctx.reply(`${data.message}. Set your local city using /setlocal [City]`);
  }
});

// Handle /setlocal command
bot.hears(/^\/setlocal (.+)/, async (ctx) => {
  const userId = ctx.update.message.from.id;
  const city = ctx.match[1].trim();

  countUserInteraction(userId);

  try {
    await Tel.findOneAndUpdate({ userid: userId }, { userid: userId, local: city }, { new: true, upsert: true });
    ctx.reply("Your local city has been set successfully. Use /now to check the weather.");
  } catch (err) {
    console.error("Error setting local city:", err);
    ctx.reply("Unable to set your local city. Please try again.");
  }
});

// Handle /weather command
bot.hears(/^\/weather (.+)/, async (ctx) => {
  const city = ctx.match[1].trim();
  countUserInteraction(ctx.update.message.from.id);

  const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${randomToken()}&units=metric`);
  const data = await response.json();

  if (data.cod === 200) {
    const imgurl = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
    const weatherInfo = `
Name: ${data.name}
Temperature: ${data.main.temp}°C
Wind: ${data.wind.speed} kph
Weather: ${data.weather[0].description}
Humidity: ${data.main.humidity}%
Country: ${data.sys.country}`;

    try {
      await bot.telegram.sendPhoto(ctx.chat.id, { url: imgurl }, { caption: weatherInfo });
    } catch (error) {
      console.error("Error sending photo:", error);
      ctx.reply("We are facing some difficulties. Please try again later.");
    }
  } else {
    ctx.reply(`${data.message}. Use /weather [City] to check another city's weather.`);
  }
});

// Webhook endpoint
app.post("/webhook", (req, res) => {
  bot.handleUpdate(req.body);
  lastActivityTime = Date.now();
  res.sendStatus(200);
});

// Health check endpoint
app.get('/ping', (req, res) => res.sendStatus(200));

// Start the server
const PORT = process.env.PORT || 9000;
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await bot.telegram.setWebhook(webhookUrl);
});
