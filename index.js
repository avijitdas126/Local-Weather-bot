const { Telegraf } = require("telegraf");
const { message } = require("telegraf/filters");
const express = require("express");
require("dotenv").config();
const { Telbot, Tel } = require('./modul'); // Import your database models
const app = express();
const bot = new Telegraf(process.env.BOT_TOKEN);

// Enable parsing of JSON requests for Express
app.use(express.json());

let token = [process.env.OpenWeather_Token0, process.env.OpenWeather_Token1];

function random() {
  return Math.floor(Math.random() * token.length);
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
    console.log("Error occurred:", error);
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
    console.log("Error inserting/updating user:", err.message);
  }

  ctx.reply(
    "Bot Commands:\n\n1.\t /now -\t\t Know your local weather.\n2. /weather [City] -\t Weather of another city.\n3. /setlocal [Your City] -\t Set your local city."
  );
});

// Handle /now command
bot.hears('/now', async (ctx) => {
  let city = await Tel.find({ userid: ctx.update.message.from.id });
  count(ctx.update.message.from.id);

  if (city.length !== 0) {
    let { message_id: msgid } = await ctx.replyWithSticker('CAACAgIAAxkBAAIBmmbmtyxl__PM1i4wsKcHKljraZGsAAIwFAACV03ASHMUDFXjRXH1NgQ');
    city = city[0].local.toLowerCase();
    let data = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${token[random()]}&units=metric`);
    data = await data.json();
    
    if (data.cod === 200) {
      let imgurl = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
      let { temp } = data.main;
      let { speed: wind } = data.wind;
      let { description: weather } = data.weather[0];
      await ctx.deleteMessage(msgid);
      
      try {
        await bot.telegram.sendPhoto(ctx.message.from.id, { url: imgurl }, {
          caption: `Name: ${data.name}\nTemperature: ${temp}°C\nWind: ${wind} kph\nWeather: ${weather}\nHumidity: ${data.main.humidity}%\nCountry: ${data.sys.country}`
        });
      } catch (err) {
        ctx.reply("We are facing some difficulties");
        console.log(err);
      }
    } else {
      await ctx.deleteMessage(msgid);
      ctx.reply(`${data.message}. Set your local city using /setlocal [City]`);
    }
  } else {
    ctx.reply("First, set your local city using /setlocal [City]");
  }
});

// Basic endpoint to check if the bot is running
app.get("/", (req, res) => {
  res.send("Bot is running!");
});

// Webhook endpoint
app.post("/webhook", (req, res) => {
  bot.handleUpdate(req.body); // Process the incoming update
  res.sendStatus(200);
});

// Health check endpoint
app.get('/ping', (req, res) => {
  res.sendStatus(200);
});

// Help command
bot.help((ctx) => {
  count(ctx.update.message.from.id);
  ctx.reply(
    "Bot Commands:\n\n1.\t /now -\t\t Know your local weather.\n2. /weather [City] -\t Weather of another city.\n3. /setlocal [Your City] -\t Set your local city."
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
        console.log("Error:", err.message);
      }
    } else {
      ctx.reply("Use /setlocal [City] to set your city.\nExample: /setlocal Tokyo");
    }
  } else if (text.startsWith("/weather")) {
    count(ctx.update.message.from.id);
    let { message_id: msgid } = await ctx.replyWithSticker('CAACAgIAAxkBAAIBmmbmtyxl__PM1i4wsKcHKljraZGsAAIwFAACV03ASHMUDFXjRXH1NgQ');
    let city = text.split("/weather ")[1];
    if (city) {
      let data = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${token[random()]}&units=metric`);
      data = await data.json();
      
      if (data.cod === 200) {
        let imgurl = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
        let { temp } = data.main;
        let { speed: wind } = data.wind;
        let { description: weather } = data.weather[0];
        await ctx.deleteMessage(msgid);
        
        try {
          await bot.telegram.sendPhoto(ctx.message.from.id, { url: imgurl }, {
            caption: `Name: ${data.name}\nTemperature: ${temp}°C\nWind: ${wind} kph\nWeather: ${weather}\nHumidity: ${data.main.humidity}%\nCountry: ${data.sys.country}`
          });
        } catch (err) {
          ctx.reply("We are facing some difficulties");
          console.log(err);
        }
      } else {
        await ctx.deleteMessage(msgid);
        ctx.reply(`${data.message}. Use /weather [City] for other cities.`);
      }
    } else {
      await ctx.deleteMessage(msgid);
      ctx.reply("Use /weather [City] for other cities.\nExample: /weather Tokyo");
    }
  } else {
    count(ctx.update.message.from.id);
    ctx.reply("Available Commands:\n1.\t /now -\t\t Know your local weather.\n2. /weather [City] -\t Weather of another city.\n3. /setlocal [City] -\t Set your local city.");
  }
});

// Function to set the webhook with retry logic
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
        console.log("Error setting webhook:", error);
        break; // Exit loop for other errors
      }
    }
    attempts++;
  }
}
// Keep-alive interval to ping the server every 5 minutes
setInterval(async () => {
  try {
    const response = await fetch(`${process.env.SERVER}/ping`);
    if (response.ok) console.log('Keep-alive ping successful');
  } catch (error) {
    console.error('Keep-alive ping failed:', error);
  }
}, 20 * 60 * 1000); // 5 minutes
// Start the server with a dynamic port
const PORT = process.env.PORT || 9000;
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await setWebhookWithRetry(webhookUrl); // Set the webhook with retry logic
});

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
