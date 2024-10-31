const { Telegraf } = require("telegraf");
const { message } = require("telegraf/filters");
const express = require("express");
const app = express();
require("dotenv").config();
const { Telbot, Tel } = require('./modul');
const bot = new Telegraf(process.env.BOT_TOKEN);
let token = [process.env.OpenWeather_Token0, process.env.OpenWeather_Token1];

function random() {
  let n = token.length;
  return Math.floor(Math.random() * n);
}

const webhookUrl = `${process.env.SERVER}/webhook`;

async function count(id) {
  try {
    const user = await Telbot.findOne({ userid: id });
    if (user) {
      const newCount = (user.count || 0) + 1;
      await Telbot.updateOne({ userid: id }, { $set: { count: newCount } });
      console.log('Count updated successfully:', newCount);
    } else {
      console.log('User not found');
    }
  } catch (error) {
    console.log('Error occurred:', error);
  }
}

bot.start(async (ctx) => {
  ctx.reply("Welcome to our service! We are excited to have you on board and look forward to supporting you. 😊");
  const userData = {
    username: ctx.update.message.from.username,
    name: `${ctx.update.message.from.first_name} ${ctx.update.message.from.last_name}`,
    userid: ctx.update.message.from.id
  };

  try {
    await Telbot.findOneAndUpdate(
      { userid: userData.userid },
      userData,
      { new: true, upsert: true }
    );
    console.log('User inserted/updated successfully:');
    count(ctx.update.message.from.id);
  } catch (err) {
    console.log('Error inserting/updating user:', err.message);
  }

  ctx.reply('Bot Commands:\n\n1.\t /now -\t\t Know your local weather immediately.\n2. /weather [City Name] -\t Know the weather of another city immediately.\n3. /setlocal [Your City] -\t Set your local city.');
});

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
        ctx.reply('We are facing some difficulties');
        console.log(err);
      }
    } else {
      await ctx.deleteMessage(msgid);
      ctx.reply(`${data.message}. Set your local city correctly using /setlocal [Your City]`);
    }
  } else {
    ctx.reply('First, set your local city using /setlocal [Your City]');
  }
});

app.get('/', (req, res) => {
  res.send('I am alive');
});

app.post("/webhook", (req, res) => {
  bot.handleUpdate(req.body);
  res.sendStatus(200);
});

bot.help((ctx) => {
  count(ctx.update.message.from.id);
  ctx.reply('Bot Commands:\n\n1.\t /now -\t\t Know your local weather immediately.\n2. /weather [City Name] -\t Know the weather of another city immediately.\n3. /setlocal [Your City] -\t Set your local city.\nFor assistance, contact @avijit126');
});

bot.on(message('text'), async (ctx) => {
  let text = ctx.update.message.text;
  if (text.startsWith('/setlocal')) {
    count(ctx.update.message.from.id);
    let city = text.split('/setlocal ')[1];
    if (city) {
      let id = ctx.update.message.from.id;
      let obj = { userid: id, local: city };
      try {
        await Tel.findOneAndUpdate({ userid: id }, obj, { new: true, upsert: true });
        ctx.reply('Your local city has been set successfully. You can check the weather using /now.');
      } catch (err) {
        ctx.reply('Unable to set your local city. Please try again.');
        console.log('Error:', err.message);
      }
    } else {
      ctx.reply('Use /setlocal [City Name] to set your local city.\nExample: /setlocal Kolkata');
    }
  } else if (text.startsWith('/weather')) {
    count(ctx.update.message.from.id);
    let { message_id: msgid } = await ctx.replyWithSticker('CAACAgIAAxkBAAIBmmbmtyxl__PM1i4wsKcHKljraZGsAAIwFAACV03ASHMUDFXjRXH1NgQ');
    let city = text.split('/weather ')[1];
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
          ctx.reply('We are facing some difficulties');
          console.log(err);
        }
      } else {
        await ctx.deleteMessage(msgid);
        ctx.reply(`${data.message}. Use /weather [City Name] for other cities.`);
      }
    } else {
      await ctx.deleteMessage(msgid);
      ctx.reply('Use /weather [City Name] for weather in another city.\nExample: /weather Kolkata');
    }
  } else {
    count(ctx.update.message.from.id);
    ctx.reply('Available Commands:\n1.\t /now -\t\t Know your local weather immediately.\n2. /weather [City Name] -\t Know the weather of another city.\n3. /setlocal [Your City] -\t Set your local city.');
  }
});

// Start the server with a dynamic port
const PORT = process.env.PORT || 9000;
app.listen(PORT, () => console.log(`Running on port ${PORT}`));

bot.launch({
  webhook: { domain: webhookUrl }
});

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
