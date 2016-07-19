//module.exports = connection.model('', {}, 'promocodes');

var mongoose = require('mongoose');
/**
User schema
*/
var promocodeSchema = mongoose.Schema({
    _id : {
        type : String
    },
    code : {
        type : String
    }
},{
    toObject: { virtuals: true },
    toJSON: { virtuals: true }
});

var Promocode = mongoose.model('Promocode', promocodeSchema);

module.exports = Promocode;
