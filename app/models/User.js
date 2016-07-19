//module.exports = connection.model('', {}, 'users');

var mongoose = require('mongoose');
/**
User schema
*/
var userSchema = mongoose.Schema({
    _id : {
        type : String
    },
    completeName : {
        type : String
    },
    isAdmin : {
        type : Boolean
    },
    acquisition : {
        type: String
    },
    store : {
      type : String
    },
    creationDate : {
        type : Date
    },
    isDriver : {
        type : Boolean
    }
},{
    toObject: { virtuals: true },
    toJSON: { virtuals: true }
});

var User = mongoose.model('User', userSchema);

module.exports = User;
