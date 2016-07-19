//module.exports = connection.model('', {}, 'orders');

var mongoose = require('mongoose');
/**
User schema
*/
var orderSchema = mongoose.Schema({
    _id : {
        type : String
    },
    distance : {
        type : Number
    },
    price : {
        type: Number
    },
    driver : {
      type : String
    },
    user : {
        type : String
    },
    startLocationAddress : {
        type : String
    },
    truckSize : {
        type : Boolean
    },
    startDate : {
        type : Date
    },
    creationDate : {
        type : Date
    },
    store : {
        type : String
    },
    status : {
        type : String
    },
    promocode : {
        type : String
    },
    geoStart : {
        geo_point: {
            type: String
        },
        lat: {
            type: Number
        },
        lon: {
            type: Number
        }
    },
    geoEnd : {
        geo_point: {
            type: String
        },
        lat: {
            type: Number
        },
        lon: {
            type: Number
        }
    }
},{
    toObject: { virtuals: true },
    toJSON: { virtuals: true }
});

var Order = mongoose.model('Order', orderSchema);

module.exports = Order;
