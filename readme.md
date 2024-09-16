## Local Weather bot is a Telegrem bot

Bot Command:

1.  /now -   Know your local weather immediately.
2. /weather [Name of another city] -  Know the weather of another city immediately.
3. /setlocal [Name of your local city] -  Set your local city.

Avalative on telegram: @local_weather_checker_bot

# How to use my bot

Open the bash terminal

```bash
git clone https://github.com/avijitdas126/Local-Weather-bot.git
```
Next 
```bash
cd Local-Weather-bot
npm install
```
Create a .env file and add the following details
```.env
BOT_TOKEN=<YOUR-BOT-TOKEN>
OpenWeather_Token0=<YOUR-OPEN WEATHER API TOKEN 1>
OpenWeather_Token1=<YOUR-OPEN WEATHER API TOKEN 2>
MongoDb_url=<YOUR-MONGODB-URL>

```
* **Bot token**- will be provided by @BotFather bot on telegram
* I use two OpenWeather api Token because of scaling 
* I use database (like Mongodb) for storing user's information

## Tech Stack
* Telegraf.js
* Mongodb
* Mongoose

## Scan and use my bot and give feedback on this github's issues 
 <img src="https://i.ibb.co/Wt0NHZd/20240916-111102.jpg" alt="qr code"/>
 
