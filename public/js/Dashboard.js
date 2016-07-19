
queue()
    .defer(d3.json, "/api/data/orders")
    // .defer(d3.json, "/api/data/drivers")
    .defer(d3.json, "/api/data/users")
    .defer(d3.json, "/api/data/promocodes")
    .await(makeGraphs);


function makeGraphs(error, apiDataOrders, apiDataUsers, apiDataCodes) {
    // makeOrderGraphs(apiDataOrders, apiDataUsers);
    // makeClientGraphs(apiDataUsers);

//Start Transformations
    var promoCodes = {};
    apiDataCodes.forEach(function(d) {
        promoCodes[d._id] = d.code;
    });


    var dataSetOrders = [];
	apiDataOrders.forEach(function(d) {
        if(moment(d.startDate) < moment().startOf('week')) {
            d.startDate = moment(d.startDate);
            d.creationDate = moment(d.creationDate);
            d.price = +d.price/100;
            if(d.promocode) {
                if(!promoCodes[d.promocode]) {
                    d.promocode = 'other code'
                }
                else{
                    d.promocode = promoCodes[d.promocode];
                }
            }
            else {
                d.promocode = "sans code";
            }
            dataSetOrders.push(d);
        }
	});

    var dataSetClients = [];
    var drivers = {};
    apiDataUsers.forEach(function(d) {
        if(d.isDriver)
		      drivers[d._id] = d.completeName;
        else {
            d.creationDate = moment(d.creationDate);
            if(d.creationDate < moment().startOf('week')) {
                dataSetClients.push(d);
            }
        }
	});

	//Create a Crossfilter instance
	var ndxOrders = crossfilter(dataSetOrders);

    function sort_group(group, order) {
        return {
            all: function() {
                var g = group.all(), map = {};

                g.forEach(function(kv) {
                    map[kv.key] = kv.value;
                });
                return order.map(function(k) {
                    return {key: k, value: map[k]};
                });
            }
        };
    };

	//Define Dimensions
    var startDate = ndxOrders.dimension(function(d) {return d.startDate;});
    var startWeek = ndxOrders.dimension(function(d) {return d.startDate.clone().startOf('week');});

    var driver = ndxOrders.dimension(function(d) {return drivers[d.driver];});
    var ordersByDriver = driver.group();
    var volumeByDriver = driver.group().reduceSum(function(d) {return d.price;});

    var price = ndxOrders.dimension(function(d) {
        if(d.price < 40) {
            // return "< 40";
            return "<40€";
        }
        else if(d.price < 60) {
            // return "40 - 60";
            return "40-60€";
        }
        else if(d.price < 80) {
            // return "60 - 80";
            return "60-80€";
        }
        else if(d.price < 100) {
            // return "80 - 100";
            return "80-100€";
        }
        else if(d.price < 120) {
            // return "100 - 120";
            return "100-120€";
        }
        else if(d.price < 150) {
            // return "120 - 150";
            return "120-150€";
        }
        else if(d.price < 200) {
            // return "150 - 200";
            return "150-200€";
        }
        else if(d.price < 300) {
            // return "150 - 200";
            return "200-300€";
        }
        else if(d.price < 400) {
            // return "150 - 200";
            return "300-400€";
        }
        else if(d.price < 500) {
            // return "200 - 500";
            return "400-500€";
        }
        else if(d.price < 1000) {
            // return "200 - 500";
            return "500-1000€";
        }
        else {
            return "≥1000€";
        }
    })

    var proOrder = ndxOrders.dimension(function(d) {
        if(d.store) {
            return "Pro";
        }
        else {
            return "Particulier";
        }
    });
    var proOrderGroup = proOrder.group();

    var promoCode = ndxOrders.dimension(function(d) {
        return d.promocode;
    });
    var promoCodeGroup = promoCode.group();

	var truckSize = ndxOrders.dimension(function(d) {
        if(d.truckSize <= 3) {
            return 1;
        }
        else if(d.truckSize <= 6) {
            return 2;
        }
        else if(d.truckSize <= 10) {
            return 3;
        }
        else {
            return 4;
        }
    });

    var emergency = ndxOrders.dimension(function(d) {
        if((d.startDate - d.creationDate) / 3600000 <= 2) {
            return "≤ 2h";
        }
        else if (d.startDate.isSame(d.creationDate, 'day')) {
            return "Même jour";
        }
        else {
            return "Planifiées";
        }
    });

    function getDayOfWeek(date) {
        var name = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
        return name[date.day()];
    }
    var dayOfWeek = ndxOrders.dimension(function (d) {
       return getDayOfWeek(d.startDate);
   });
   var ordersByDayOfWeek = dayOfWeek.group();
   var volumeByDayOfWeek = dayOfWeek.group().reduceSum(function(d) {return d.price;});

   function getArea(address) {
       var regex = new RegExp('[0-9]{5}','i');
       var codePostal = address.match(regex);
       if(!codePostal) {
           return 'Other';
       }
       var paris = 75;
       var smallParis = [92, 93, 94];
       var bigParis = [77, 91, 78, 95];
       var dep = parseInt(codePostal[0].slice(0,2));
       if(dep == 75) {
           return 'Paris';
       }
       else if(smallParis.includes(dep)) {
           return 'Pte. C.';
       }
       else if(bigParis.includes(dep)) {
           return 'Gr. C.';
       }
       else return 'Other';
   }

   var order = $.map(dataSetOrders, function(d) {
        return getArea(d.startLocationAddress);
   });

   var startArea = ndxOrders.dimension(function (d) {
        return getArea(d.startLocationAddress);
   })
   var ordersByStartArea = startArea.group();
   var ordersByStartAreaSorted = sort_group(ordersByStartArea, order);
   var volumeByStartArea = startArea.group().reduceSum(function(d) {return d.price});
   var volumeByStartAreaSorted = sort_group(volumeByStartArea, order);

   var endArea = ndxOrders.dimension(function (d) {
        return getArea(d.endLocationAddress);
   })
   var ordersByEndArea = endArea.group();
   var ordersByEndAreaSorted = sort_group(ordersByEndArea, order);
   var volumeByEndArea = endArea.group().reduceSum(function(d) {return d.price});
   var volumeByEndAreaSorted = sort_group(volumeByEndArea, order);

   var ordersToParis = startArea.group().reduceSum(function(d) {
       var endArea = getArea(d.endLocationAddress);
       if(endArea === 'Paris') {return 1;}
       else return 0;
   })
   var ordersToSmallParis = startArea.group().reduceSum(function(d) {
       var endArea = getArea(d.endLocationAddress);
       if(endArea === 'Pet. C.') {return 1;}
       else return 0;
   })
   var ordersToBigParis = startArea.group().reduceSum(function(d) {
       var endArea = getArea(d.endLocationAddress);
       if(endArea === 'Gr. C.') {return 1;}
       else return 0;
   })
   var volumeToParis = startArea.group().reduceSum(function(d) {
       var endArea = getArea(d.endLocationAddress);
       if(endArea === 'Paris') {return d.price;}
       else return 0;
   })
   var volumeToSmallParis = startArea.group().reduceSum(function(d) {
       var endArea = getArea(d.endLocationAddress);
       if(endArea === 'Petite Couronne') {return d.price;}
       else return 0;
   })
   var volumeToBigParis = startArea.group().reduceSum(function(d) {
       var endArea = getArea(d.endLocationAddress);
       if(endArea === 'Grande Couronne') {return d.price;}
       else return 0;
   })

   // var order = $.map(dataSetOrders, function(d) {
   //      return getArea(d.startLocationAddress);
   // });

   var ordersToParisSorted = sort_group(ordersToParis, order);
   var ordersToSmallParisSorted = sort_group(ordersToSmallParis, order);
   var ordersToBigParisSorted = sort_group(ordersToBigParis, order);
   var volumeToParisSorted = sort_group(volumeToParis, order);
   var volumeToSmallParisSorted = sort_group(volumeToSmallParis, order);
   var volumeToBigParisSorted = sort_group(volumeToBigParis, order);


	//Calculate metrics
	// var ordersByDistance = distance.group(function(distance) { return 5*Math.floor(distance / 5000); });
    var ordersByStartWeek = startWeek.group();
    var ordersByPrice = price.group();
    var volumeByPrice = price.group().reduceSum(function(d) {return d.price});
	var ordersByTruckSize = truckSize.group();
	var ordersByEmergency = emergency.group();
    var volumeByEmergency = emergency.group().reduceSum(function(d) {return d.price});
    //
	var all = ndxOrders.groupAll();
    var allDim = ndxOrders.dimension(function(d) {return d;});

	//Calculate Groups
    var volumeByStartWeek = startWeek.group().reduceSum(function(d) {return d.price});

	var totalVolumes = ndxOrders.groupAll().reduceSum(function(d) {return d.price;});
    var weekGroup = ndxOrders.groupAll().reduce(
      (p, v) => { // add element
        var week = v.startDate.clone().startOf('week').format();
        var count = p.weeks.get(week) ||  0;
        p.weeks.set(week, count + 1);
        return p;
      },

      (p, v) => { // remove element
        var week = v.startDate.clone().startOf('week').format();
        var count = p.weeks.get(week);
        if (count === 1) {
          p.weeks.delete(week);
        } else {
          p.weeks.set(week, count - 1);
        }
        return p;
      },

      () => { // init
        return {
          weeks: new Map()
        };
    });

    function addFunOrdersPercentage(lower, upper) {
      return (p, v) => { // add element
          var count = p.map.get(v.user) ||  0;
          p.map.set(v.user, count + 1);
           p.total++;
          if(count == lower - 1) {
              p.target += lower;
          }
          else if(count >= lower && count < upper) {
              p.target++;
          }
          else if(count == upper) {
              p.target -= upper;
          }
          return p;
      }
    }
    function removeFunOrdersPercentage(lower, upper) {
      return (p, v) => { // add element
          var count = p.map.get(v.user);
          if(count == lower) {
              p.target -= lower;
          }
          else if(count > lower && count <= upper) {
              p.target--;
          }
          else if(count == upper + 1) {
              p.target += upper;
          }
        p.total--;
          if(count == 1) {
              p.map.delete(v.user);
          }
          else {
               p.map.set(v.user, count - 1);
          }
          return p;
      }
    }
    function initFunOrdersPercentage() { // init
    return {
      target: 0,
      total: 0,
      map: new Map()
    };
    };

    function addFunVolPercentage(lower, upper) {
      return (p, v) => { // add element
          var count = p.map.get(v.user) ||  0;
          var vol = p.mapVol.get(v.user) || 0;
          p.map.set(v.user, count + 1);
           p.mapVol.set(v.user, vol + v.price);
           p.total += v.price;
          if(count == lower - 1) {
              p.target += vol + v.price;
          }
          else if(count >= lower && count < upper) {
              p.target += v.price;
          }
          else if(count == upper) {
              p.target -= vol;
          }
          return p;
      }
    }
    function removeFunVolPercentage(lower, upper) {
      return (p, v) => { // add element
          var count = p.map.get(v.user);
          var vol = p.mapVol.get(v.user);
          if(count == lower) {
              p.target -= vol;
          }
          else if(count > lower && count <= upper) {
              p.target -= v.price;
          }
          else if(count == upper + 1) {
              p.target += vol - v.price;
          }
        p.total -= v.price;
          if(count == 1) {
              p.map.delete(v.user);
              p.mapVol.delete(v.user);
          }
          else {
               p.map.set(v.user, count - 1);
               p.mapVol.set(v.user, vol - v.price);
          }
          return p;
      }
    }
    function initFunVolPercentage() { // init
        return {
            target: 0,
            total: 0,
            map: new Map(),
            mapVol: new Map()
        };
    };

    var retentionGroup = ndxOrders.groupAll().reduce(
        addFunOrdersPercentage(2, Infinity),
        removeFunOrdersPercentage(2, Infinity),
        initFunOrdersPercentage
    )

    var retentionVolume = ndxOrders.groupAll().reduce(
        addFunVolPercentage(2, Infinity),
        removeFunVolPercentage(2, Infinity),
        initFunVolPercentage
    )

    var oneOrderGroup = ndxOrders.groupAll().reduce(
        addFunOrdersPercentage(1, 1),
        removeFunOrdersPercentage(1, 1),
        initFunOrdersPercentage
    )

    var oneOrderVolume = ndxOrders.groupAll().reduce(
        addFunVolPercentage(1, 1),
        removeFunVolPercentage(1, 1),
        initFunVolPercentage
    )


    var twoOrderGroup = ndxOrders.groupAll().reduce(
        addFunOrdersPercentage(2, 2),
        removeFunOrdersPercentage(2, 2),
        initFunOrdersPercentage
    )

    var twoOrderVolume = ndxOrders.groupAll().reduce(
        addFunVolPercentage(2, 2),
        removeFunVolPercentage(2, 2),
        initFunVolPercentage
    )

    var threeToFiveOrderGroup = ndxOrders.groupAll().reduce(
        addFunOrdersPercentage(3, 5),
        removeFunOrdersPercentage(3, 5),
        initFunOrdersPercentage
    )

    var threeToFiveOrderVolume = ndxOrders.groupAll().reduce(
        addFunVolPercentage(3, 5),
        removeFunVolPercentage(3, 5),
        initFunVolPercentage
    )

    var sixToTenOrderGroup = ndxOrders.groupAll().reduce(
        addFunOrdersPercentage(6, 10),
        removeFunOrdersPercentage(6, 10),
        initFunOrdersPercentage
    )

    var sixToTenOrderVolume = ndxOrders.groupAll().reduce(
        addFunVolPercentage(6, 10),
        removeFunVolPercentage(6, 10),
        initFunVolPercentage
    )

    var tenPlusOrderGroup = ndxOrders.groupAll().reduce(
        addFunOrdersPercentage(11, Infinity),
        removeFunOrdersPercentage(11, Infinity),
        initFunOrdersPercentage
    )

    var tenPlusOrderVolume = ndxOrders.groupAll().reduce(
        addFunVolPercentage(11, Infinity),
        removeFunVolPercentage(11, Infinity),
        initFunVolPercentage
    )

	//Define threshold values for data
    var minDateOrder = startDate.bottom(1)[0].startDate.clone().startOf('week');
    var maxDateOrder = startDate.top(1)[0].startDate.clone().endOf('week');
    var minWeekOrder = startWeek.bottom(1)[0].startDate.clone().startOf('week');
    var maxWeekOrder = startWeek.top(1)[0].startDate.clone().startOf('week');

    // var filterDimension = ndxOrders.dimension(function (d) {return d.startDate;});

    $(function() {

        function cb(start, end) {
            startWeek.filterRange([start, end]);
            dc.redrawAll();
        }

        $('#reportrange').daterangepicker({
            startDate: minDateOrder,
            endDate: maxDateOrder,
            minDate: minDateOrder,
            maxDate: maxDateOrder,
            ranges: {
               'Last 7 Days': [maxDateOrder.clone().subtract(6, 'days'), maxDateOrder],
               'Last 30 Days': [maxDateOrder.clone().subtract(29, 'days'), maxDateOrder],
               'This Month': [maxDateOrder.clone().startOf('month'), maxDateOrder.clone().endOf('month')],
               'Last Month': [maxDateOrder.clone().subtract(1, 'month').startOf('month'), maxDateOrder.clone().subtract(1, 'month').endOf('month')]
            }
        }, cb);

        $('#reportrange span').html(minDateOrder.format('DD/MM/YY') + ' - ' + maxDateOrder.format('DD/MM/YY'));
        // cb(start, end);
    });


    //Charts
    var priceChart = dc.rowChart("#price-chart");
    var dayOfWeekChart = dc.rowChart("#day-of-week");
	var emergencyChart = dc.pieChart("#emergency-chart");
    var weeklyEvolutionOrderChart = dc.lineChart("#weekly-evolution-order");
    var driverChart = dc.rowChart("#driver-chart");
    var fluxChart = dc.barChart("#flux-chart");
    var dataCountOrder = dc.dataCount('#data-count-order');
    var totalOrders = dc.numberDisplay("#total-orders");
    var netTotalVolumes = dc.numberDisplay("#total-volumes");
    var weekCount = dc.numberDisplay("#week-count");
    var retentionRate = dc.numberDisplay("#retention-rate");
    var oneOrderRate = dc.numberDisplay("#one-order-rate");
    var twoOrderRate = dc.numberDisplay("#two-order-rate");
    var threeToFiveOrderRate = dc.numberDisplay("#three-to-five-order-rate");
    var sixToTenOrderRate = dc.numberDisplay("#six-to-ten-order-rate");
    var tenPlusOrderRate = dc.numberDisplay("#ten-plus-order-rate");


  selectField = dc.selectMenu('#proDropDown')
    .dimension(proOrder)
    .group(proOrderGroup);

    dc.selectMenu('#codeDropDown')
      .dimension(promoCode)
      .group(promoCodeGroup);

    dc.selectMenu('#driverDropDown')
    .dimension(driver)
    .group(ordersByDriver);


  totalOrders
  .formatNumber(d3.format("d"))
  .valueAccessor(function(d){return d; })
  .group(all);

  netTotalVolumes
  .valueAccessor(function(d){return d; })
  .group(totalVolumes)
  .formatNumber(d3.format(".3s"));

  weekCount
  .formatNumber(d3.format("d"))
  .group(weekGroup)
   .valueAccessor(
       (d) => {
           return d.weeks.size;
        }
    );

    // retentionRate
    // .formatNumber(d3.format(",.1%"))
    // .group(retentionGroup)
    // .valueAccessor(
    //     (d) => {
    //     // return d.returning_clients / d.total_clients;
    //     return d.target / d.total;
    //     }
    // );

    // oneOrderRate
    // .formatNumber(d3.format(",.1%"))
    // .group(oneOrderGroup)
    // .valueAccessor(
    //     (d) => {
    //     // return d.returning_clients / d.total_clients;
    //     return d.target / d.total;
    //     }
    // );

    twoOrderRate
    .formatNumber(d3.format(",.1%"))
    .group(twoOrderGroup)
    .valueAccessor(
        (d) => {
        // return d.returning_clients / d.total_clients;
        return d.target / d.total;
        }
    );

    threeToFiveOrderRate
    .formatNumber(d3.format(",.1%"))
    .group(threeToFiveOrderGroup)
    .valueAccessor(
        (d) => {
        // return d.returning_clients / d.total_clients;
        return d.target / d.total;
        }
    );

    sixToTenOrderRate
    .formatNumber(d3.format(",.1%"))
    .group(sixToTenOrderGroup)
    .valueAccessor(
        (d) => {
        // return d.returning_clients / d.total_clients;
        return d.target / d.total;
        }
    );

    tenPlusOrderRate
    .formatNumber(d3.format(",.1%"))
    .group(tenPlusOrderGroup)
    .valueAccessor(
        (d) => {
        // return d.returning_clients / d.total_clients;
        return d.target / d.total;
        }
    );

    var chartParams = {
        orders: {
            group: {
                evolution: ordersByStartWeek,
                driver: ordersByDriver,
                flux: {
                    Start: ordersByStartAreaSorted,
                    End: ordersByEndAreaSorted
                },
                fluxToParis: ordersToParisSorted,
                fluxToSmallParis: ordersToSmallParisSorted,
                fluxToBigParis: ordersToBigParisSorted,
                price: ordersByPrice,
                dayOfWeek: ordersByDayOfWeek,
                emergency: ordersByEmergency,
                retention: retentionGroup,
                oneOrder: oneOrderGroup,
                twoOrder: twoOrderGroup,
                threeToFiveOrder: threeToFiveOrderGroup,
                sixToTenOrder: sixToTenOrderGroup,
                tenPlusOrder: tenPlusOrderGroup
            },
            yAxisLabel: "Course",
            ticks: 7,
            tickFormat: "d",
            colors: '#377eb8'
        },
        volume: {
            group: {
                evolution: volumeByStartWeek,
                driver: volumeByDriver,
                flux: {
                    Start: volumeByStartAreaSorted,
                    End: volumeByEndAreaSorted
                },
                fluxToParis: volumeToParisSorted,
                fluxToSmallParis: volumeToSmallParisSorted,
                fluxToBigParis: volumeToBigParisSorted,
                price: volumeByPrice,
                dayOfWeek: volumeByDayOfWeek,
                emergency: volumeByEmergency,
                retention: retentionVolume,
                oneOrder: oneOrderVolume,
                twoOrder: twoOrderVolume,
                threeToFiveOrder: threeToFiveOrderVolume,
                sixToTenOrder: sixToTenOrderVolume,
                tenPlusOrder: tenPlusOrderVolume
            },
            yAxisLabel: "Volume",
            ticks: 7,
            tickFormat: "3s",
            colors: '#ff7f00'
        },
        Start: "Départ",
        End: "Arrivée"
    }

    var mapDropDownVal = 'Start';
    var chartDropDownVal = 'orders';
    function renderCharts () {
        weeklyEvolutionOrderChart
            //.width(800)
            .height(240)
            .dimension(startWeek)
            .group(chartParams[chartDropDownVal].group.evolution)
            .margins({top: 10, right: 50, bottom: 30, left: 50})
            .colors([chartParams[chartDropDownVal].colors])
            .elasticY(true)
            .x(d3.time.scale().domain([minDateOrder, maxDateOrder]))
            .renderHorizontalGridLines(true)
            .renderVerticalGridLines(true)
            .yAxisLabel(chartParams[chartDropDownVal].yAxisLabel)
            .yAxis().ticks(chartParams[chartDropDownVal].ticks).tickFormat(d3.format(chartParams[chartDropDownVal].tickFormat));

        driverChart
            //.width(300)
            .height(240)
            .dimension(driver)
            .group(chartParams[chartDropDownVal].group.driver)
             .ordering(function(d) { return -d.value })
            .cap(10)
            .othersGrouper(false)
            .elasticX(true)
            .xAxis().ticks(chartParams[chartDropDownVal].ticks).tickFormat(d3.format(chartParams[chartDropDownVal].tickFormat));
        // dc.renderAll();

        fluxChart
        	//.width(800)
            .height(200)
            // .transitionDuration(1000)
            .dimension(startArea)
            .group(chartParams[chartDropDownVal].group.flux[mapDropDownVal])
            .margins({top: 10, right: 50, bottom: 30, left: 50})
            .centerBar(false)
            .gap(5)
            .elasticY(true)
            .x(d3.scale.ordinal().domain(startArea))
            .xUnits(dc.units.ordinal)
            .renderHorizontalGridLines(true)
            .renderVerticalGridLines(true)
            .colors([chartParams[chartDropDownVal].colors])
            // .xAxisLabel(chartParams[mapDropDownVal])
            .yAxisLabel(chartParams[chartDropDownVal].yAxisLabel)
            .yAxis().ticks(chartParams[chartDropDownVal].ticks).tickFormat(d3.format(chartParams[chartDropDownVal].tickFormat));

        // priceChart
        // 	//.width(800)
        //     .height(180)
        //     // .transitionDuration(1000)
        //     .dimension(price)
        //     .group(chartParams[chartDropDownVal].group.price)
        //     .margins({top: 10, right: 50, bottom: 30, left: 50})
        //     .centerBar(false)
        //     .gap(5)
        //     .elasticY(true)
        //     .x(d3.scale.ordinal().domain(price))
        //     .xUnits(dc.units.ordinal)
        //     .renderHorizontalGridLines(true)
        //     .renderVerticalGridLines(true)
        //     .colors([chartParams[chartDropDownVal].colors])
        //     .yAxisLabel(chartParams[chartDropDownVal].yAxisLabel)
        //     .yAxis().ticks(chartParams[chartDropDownVal].ticks).tickFormat(d3.format(chartParams[chartDropDownVal].tickFormat));
        //     // .legend(dc.legend().x(200).y(10).gap(5))

            priceChart
                //.width(300)
                .height(240)
                .dimension(price)
                .group(chartParams[chartDropDownVal].group.price)
                .ordering(function(d) {
                    var prices = ['<40€', '40-60€', '60-80€', '80-100€', '100-120€', '120-150€', '150-200€', '200-300€', '300-400€', '400-500€', '500-1000€', '≥1000€'];
                    return prices.indexOf(d.key);
                })
                .elasticX(true)
                .xAxis().ticks(chartParams[chartDropDownVal].ticks).tickFormat(d3.format(chartParams[chartDropDownVal].tickFormat));

        dayOfWeekChart
            //.width(300)
            .height(200)
            .dimension(dayOfWeek)
            .group(chartParams[chartDropDownVal].group.dayOfWeek)
            .ordering(function(d) {
                var days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
                return days.indexOf(d.key);
            })
            .elasticX(true)
            .xAxis().ticks(chartParams[chartDropDownVal].ticks).tickFormat(d3.format(chartParams[chartDropDownVal].tickFormat));

        emergencyChart
          .height(200)
          .dimension(emergency)
          .group(chartParams[chartDropDownVal].group.emergency)
          .innerRadius(20);

          retentionRate
          .formatNumber(d3.format(",.1%"))
          .group(chartParams[chartDropDownVal].group.retention)
          .valueAccessor(
              (d) => {
              // return d.returning_clients / d.total_clients;
              return d.target / d.total;
              }
          );

          oneOrderRate
          .formatNumber(d3.format(",.1%"))
          .group(chartParams[chartDropDownVal].group.oneOrder)
          .valueAccessor(
              (d) => {
              // return d.returning_clients / d.total_clients;
              return d.target / d.total;
              }
          );

          twoOrderRate
          .formatNumber(d3.format(",.1%"))
          .group(chartParams[chartDropDownVal].group.twoOrder)
          .valueAccessor(
              (d) => {
              // return d.returning_clients / d.total_clients;
              return d.target / d.total;
              }
          );

          threeToFiveOrderRate
          .formatNumber(d3.format(",.1%"))
          .group(chartParams[chartDropDownVal].group.threeToFiveOrder)
          .valueAccessor(
              (d) => {
              // return d.returning_clients / d.total_clients;
              return d.target / d.total;
              }
          );

          sixToTenOrderRate
          .formatNumber(d3.format(",.1%"))
          .group(chartParams[chartDropDownVal].group.sixToTenOrder)
          .valueAccessor(
              (d) => {
              // return d.returning_clients / d.total_clients;
              return d.target / d.total;
              }
          );

          tenPlusOrderRate
          .formatNumber(d3.format(",.1%"))
          .group(chartParams[chartDropDownVal].group.tenPlusOrder)
          .valueAccessor(
              (d) => {
              // return d.returning_clients / d.total_clients;
              return d.target / d.total;
              }
          );
    }
    renderCharts();

    d3.select('#chartDropDown').on('change', function(){
        chartDropDownVal = this.value;
        $('#retention-rate').css('background', chartParams[chartDropDownVal].colors);
        $('#one-order-rate').css('background', chartParams[chartDropDownVal].colors);
        $('#two-order-rate').css('background', chartParams[chartDropDownVal].colors);
        $('#three-to-five-order-rate').css('background', chartParams[chartDropDownVal].colors);
        $('#six-to-ten-order-rate').css('background', chartParams[chartDropDownVal].colors);
        $('#ten-plus-order-rate').css('background', chartParams[chartDropDownVal].colors);
        renderCharts();
        dc.redrawAll();
    });




    dataCountOrder
      .dimension(ndxOrders)
      .group(all)


      // register handlers
    d3.selectAll('a#all').on('click', function () {
        dc.filterAll();
        dc.renderAll();
    });

    var mymap = L.map('mapid').setView([48.856578, 2.351828], 11);
    var geoOrders = new L.FeatureGroup();
    // var mapDropDownVal = 'Start';
    // var marker = L.marker([48.867215, 2.2979512]).addTo(mymap);

    var styleUrl = 'https://api.mapbox.com/styles/v1/mapbox/light-v9/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1Ijoid3V5dXpoZSIsImEiOiJjaXFjeGNpcGwwMDdyaTJuaGI2bm50eWU3In0.JTNJUsAs2-rRMKbLJAoXoQ';
    L.tileLayer(styleUrl).addTo(mymap);




        var dataTable = dc.dataTable('#data-table');

        dataTable
            .dimension(allDim)
            .group(function (d) { return 'dc.js insists on putting a row here so I remove it using JS'; })
            .on('renderlet', function (table) {
                var minWeekSelected = startWeek.bottom(1)[0].startDate.clone().startOf('week');
                var maxWeekSelected = startWeek.top(1)[0].startDate.clone().endOf('week');
                $('#reportrange span').html(minWeekSelected.format('DD/MM/YY') + ' - ' + maxWeekSelected.format('DD/MM/YY'));
                // update map to match filtered data
                geoOrders.clearLayers();
                var points = [];
                _.each(allDim.top(Infinity), function (d) {
                    var loc = d['geo' + mapDropDownVal];
                    points.push([loc.lat, loc.lon]);
                });
                var heat = L.heatLayer(points, {radius: 20, blur: 5, gradient: {0.2: 'blue', 0.4: 'lime', 0.6: 'yellow', 0.8: 'orange', 1: 'red'}});
                geoOrders.addLayer(heat);
                mymap.addLayer(geoOrders);
            });

        d3.select('#mapDropDown').on('change', function(){
            geoOrders.clearLayers();
            mapDropDownVal = this.value;
            var points = [];
            _.each(allDim.top(Infinity), function (d) {
                var loc = d['geo' + mapDropDownVal];
                points.push([loc.lat, loc.lon]);
            });
            var heat = L.heatLayer(points, {radius: 20, blur: 5, gradient: {0.2: 'blue', 0.4: 'lime', 0.6: 'yellow', 0.8: 'orange', 1: 'red'}});
            geoOrders.addLayer(heat);
            mymap.addLayer(geoOrders);
            fluxChart
                .group(chartParams[chartDropDownVal].group.flux[mapDropDownVal])
            //     .xAxisLabel(chartParams[mapDropDownVal])
            dc.redrawAll();
        });


    var ndxClients = crossfilter(dataSetClients);

    var proUser = ndxClients.dimension(function(d) {
            if(d.store) {
                return "Pro";
            }
            else {
                return "Particulier";
            }
        });
        var proUserGroup = proUser.group();

        var creationWeekUser = ndxClients.dimension(function(d) {
            return d.creationDate.clone().startOf('week');
        });

        var weekGroupClients = ndxClients.groupAll().reduce(
          (p, v) => { // add element
            var week = v.creationDate.clone().startOf('week').format();
            var count = p.weeks.get(week) ||  0;
            p.weeks.set(week, count + 1);
            return p;
          },

          (p, v) => { // remove element
            var week = v.creationDate.clone().startOf('week').format();
            var count = p.weeks.get(week);
            if (count === 1) {
              p.weeks.delete(week);
            } else {
              p.weeks.set(week, count - 1);
            }
            return p;
          },

          () => { // init
            return {
              weeks: new Map()
            };
          });

    	var creationDate = ndxClients.dimension(function(d) { return d.creationDate; });

        var acquisition = ndxClients.dimension(function(d) {
            if(d.acquisition) {return d.acquisition;}
            else return 'OTHER';
        })
        function remove_other_row(source_group) {
            return {
                all:function () {
                    return source_group.all().filter(function(d) {
                        return d.value != 0;
                    });
                }
            };
        }

        var usersByAcquisition = acquisition.group();
        var usersByAcquisitionWithoutOthers = remove_other_row(usersByAcquisition);

    	var usersByCreationWeek = creationWeekUser.group();
        //
    	var allClients = ndxClients.groupAll();
        var allDimClients = ndxClients.dimension(function(d) {return d;});

    	//Define threshold values for data
    	var minDateUser = creationDate.bottom(1)[0].creationDate.clone().startOf('week');
    	var maxDateUser = creationDate.top(1)[0].creationDate.clone().endOf('week');

        var minWeekUser = creationWeekUser.bottom(1)[0].creationDate.clone().startOf('week');
        var maxWeekUser = creationWeekUser.top(1)[0].creationDate.clone().endOf('week');

        $(function() {

            function cb(start, end) {
                creationWeekUser.filterRange([start, end]);
                dc.redrawAll();
            }

            $('#reportrangeClients').daterangepicker({
                startDate: minDateUser,
                endDate: maxDateUser,
                minDate: minDateUser,
                maxDate: maxDateUser,
                ranges: {
                   'Last 7 Days': [maxDateUser.clone().subtract(6, 'days'), maxDateUser],
                   'Last 30 Days': [maxDateUser.clone().subtract(29, 'days'), maxDateUser],
                   'This Month': [maxDateUser.clone().startOf('month'), maxDateUser.clone().endOf('month')],
                   'Last Month': [maxDateUser.clone().subtract(1, 'month').startOf('month'), maxDateUser.clone().subtract(1, 'month').endOf('month')]
                }
            }, cb);

            $('#reportrangeClients span').html(minDateUser.format('DD/MM/YY') + ' - ' + maxDateUser.format('DD/MM/YY'));
            // cb(start, end);
        });


        //Charts
    	// var creationDateChart = dc.lineChart("#creation-date");
        var weeklyEvolutionUserChart = dc.lineChart('#weekly-evolution-user');
        var acquisitionChart = dc.rowChart("#acquisition-chart");
    //     // var dayOfWeekChart = dc.rowChart("#day-of-week");
    	var totalUsers = dc.numberDisplay("#total-users");
        var dataCountUser = dc.dataCount('#data-count-user');
        var weekCountClients = dc.numberDisplay("#week-count-clients");
    //
    //     d3.selectAll('a#all').on('click', function () {
    //         dc.filterAll();
    //         dc.renderAll();
    //       });
    //
    //   selectField = dc.selectMenu('#menuselect')
    //         .dimension(proUser)
    //         .group(proUserGroup);
    //
    //     //    dc.dataCount("#row-selection")
    //     //     .dimension(ndxClients)
    //     //     .group(allClients);
    //
        selectField = dc.selectMenu('#proDropDownClients')
          .dimension(proUser)
          .group(proUserGroup);


        dataCountUser
              .dimension(ndxClients)
              .group(allClients);

          totalUsers
          .formatNumber(d3.format("d"))
          .valueAccessor(function(d){return d; })
          .group(allClients);

          weekCountClients
          .formatNumber(d3.format("d"))
          .group(weekGroupClients)
           .valueAccessor(
               (d) => {
                   return d.weeks.size;
                }
            );

    	weeklyEvolutionUserChart
    		//.width(600)
    		.height(240)
    		.margins({top: 10, right: 50, bottom: 30, left: 50})
    		.dimension(creationWeekUser)
    		.group(usersByCreationWeek)
    		.transitionDuration(500)
    		.x(d3.time.scale().domain([minWeekUser, maxWeekUser]))
    		.elasticY(true)
    		.renderHorizontalGridLines(true)
        	.renderVerticalGridLines(true)
            .yAxisLabel("Nouveaux users")
    		.yAxis().ticks(6);

        acquisitionChart
            //.width(300)
            .height(240)
            .dimension(acquisition)
            .group(usersByAcquisition)
             .ordering(function(d) { return -d.value })
            .cap(10)
            .othersGrouper(false)
            .elasticX(true)
            .xAxis().ticks(10).tickFormat(d3.format("s"));


        var dataTableClients = dc.dataTable('#data-table-clients');

        dataTableClients
            .dimension(allDimClients)
            .group(function (d) { return 'dc.js insists on putting a row here so I remove it using JS'; })
            .on('renderlet', function (table) {
                var minWeekSelected = creationWeekUser.bottom(1)[0].creationDate.clone().startOf('week');
                var maxWeekSelected = creationWeekUser.top(1)[0].creationDate.clone().endOf('week');
                $('#reportrangeClients span').html(minWeekSelected.format('DD/MM/YY') + ' - ' + maxWeekSelected.format('DD/MM/YY'));
            });

//
  dc.renderAll();


};
