var moment = require('moment');
var Order = require('./models/Order');
var User = require('./models/User')
var PromoCode = require('./models/PromoCode');

module.exports = function(app) {
  app.get('/api/data/orders', function(req, res) {
    Order.find({
      price: {
        $exists: true,
        $gt: 0
      },
      status: "ENDED"
    }, {
      '_id': 0,
      'distance': 1,
      'price': 1,
      'driver': 1,
      'user': 1,
      'startLocationAddress': 1,
      'endLocationAddress': 1,
      'truckSize': 1,
      'startDate': 1,
      'creationDate': 1,
      'store': 1,
      'promocode': 1,
      'geoStart': 1,
      'geoEnd': 1
    }, function(error, orders) {
      if(error)
        return res.send(error);
      res.json(orders);
    });
  });

  app.get('/api/data/users', function(req, res) {
    User.find({
      isAdmin: false
    }, function(error, users) {
      if(error)
        return res.send(error);
      res.json(users);
    });
  });

  app.get('/api/data/promocodes', function(req, res) {
    PromoCode.find({}, {
      "_id": 1,
      "code": 1
    }, function(error, promocodes) {
      if(error)
        return res.send(error);
      res.json(promocodes);
    });
  });

  app.get('*', function(req, res) {
    res.sendfile('./public/index.html');
  });
};
