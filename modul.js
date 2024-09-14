const mongoose=require('mongoose')

mongoose.connect('mongodb://0.0.0.0:27017/telbot')
  .then(() => console.log('Connected! Your db'));
const Schema = mongoose.Schema;


const TelSchema = new Schema({
  username: String,
  name: String,
  userid:String,
});
const TelUse = new Schema({
    local:String,
    userid:String,
  });
const Telbot = mongoose.model('Telbot',TelSchema);
const Tel = mongoose.model('TelUse',TelUse);
module.exports={Telbot,Tel}