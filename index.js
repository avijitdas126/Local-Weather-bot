const { Telegraf } = require("telegraf");
const { message } = require("telegraf/filters");
require("dotenv").config();
const {Telbot,Tel} =require('./modul')
const bot = new Telegraf(process.env.BOT_TOKEN);

//when bot start
bot.start(async (ctx) => {
  ctx.reply(
    "Welcome to our service! We are excited to have you on board and look forward to supporting you. 😊"
  );
  const userData = {
    username: ctx.update.message.from.username,
    name: ctx.update.message.from.first_name + " " + ctx.update.message.from.last_name,
    userid: ctx.update.message.from.id
  };

  try {
    const user = await Telbot.findOneAndUpdate(
      { userid: userData.userid },   // Search by `userid`
      userData,                      // Update the document with this data
      { new: true, upsert: true }     // Create new if not found, return the updated document
    );

    console.log('User inserted/updated successfully:', user);
  } catch (err) {
    console.error('Error inserting/updating user:', err);
  }
  ctx.reply('Bot Command:\n\n1.\t /now -\t\t Know your local weather immediately.\n2. /weather [Name of another city] -\t Know the weather of another city immediately.\n3. /setlocal [Name of your local city] -\t Set your local city.');
});
bot.hears('/now', async (ctx) => {
    let city=await Tel.find({userid:ctx.update.message.from.id})
    if(city.length){
      city=city[0].local.toLowerCase()
      let data=await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${process.env.OpenWeather_Token}&units=metric`)
     data=await data.json()
     if(data.cod==200){
     let temp=data.main.temp;
     let wind=data.wind.speed
     let weather=data.weather[0].description
   
   ctx.reply( `Name: ${data.name}\nTemperature: ${temp} degree Celsius\nWind: ${wind} kph\nWeather: ${weather}\nHumidity: ${data.main.humidity} percentenge\nNation: ${data.sys.country}` );
   
     }
     else{
       ctx.reply(`${data.message}. Set Your local city correctly using /setlocal`)
     }
    }
    else{
      ctx.reply(`Frist, Set Your local city correctly using /setlocal`)
    }


})
bot.on(message('text'), async (ctx) => {
    let text=(ctx.update.message.text)
    if(text.includes('/setlocal')){
        let city=text.split(' ')[1]
        let id=ctx.update.message.from.id
         let obj={useid:id,local:city}
       try {
        const user = await Tel.findOneAndUpdate(
          { userid: id },   
          obj,                      
          { new: true, upsert: true }     
        );
        console.log('User inserted/updated successfully:');
        ctx.reply('Your Local City is added sucessfully.\nIf immediately know your current weather when you\nwill type /now. 😊')
      } catch (err) {
        ctx.reply('Your Local City is added unsucessfully.Try again.')
        console.error('Error inserting/updating user:', err);
      }
    }
    else if(text.includes('/weather')){
        let city=text.split(' ')[1]
        let data=await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${process.env.OpenWeather_Token}&units=metric`)
  data=await data.json()
  if(data.cod==200){
  let temp=data.main.temp;
  let wind=data.wind.speed
  let weather=data.weather[0].description

ctx.reply( `Name: ${data.name}\nTemperature: ${temp} degree Celsius\nWind: ${wind} kph\nWeather: ${weather}\nHumidity: ${data.main.humidity} percentenge\nNation: ${data.sys.country}` );

  }
  else{
    ctx.reply(`${data.message}. Set Your local city correctly using /setlocal`)
  }
    }
})
//launch a bot
bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
