

const Binance = require('node-binance-api');
const binance = new Binance().options({
    APIKEY: 'CjyKDv8uPxcx2ffUSWL7sGTEhfgssBWQg2QduZyfWcXIftExfGUuF962eoZAF9gf',
  APISECRET: 't8JFcg19o0G9sVRCr47SyaBAZFpfyQSK4kEYqO2UnjuTDoV8OnCBZNwy0jvADemI',
  useServerTime: true, // If you get timestamp errors, synchronize to server time at startup
  test: false, // If you want to use sandbox mode where orders are simulated
  verbose: false, // Add extra output when subscribing to websockets, etc
  log: log => {
    console.log(log); // You can create your own logger here, or disable console output
   // log.info(log);
  }
});

/*
const binance = require('node-binance-api');
binance.options({
    APIKEY: 'CjyKDv8uPxcx2ffUSWL7sGTEhfgssBWQg2QduZyfWcXIftExfGUuF962eoZAF9gf',
  APISECRET: 't8JFcg19o0G9sVRCr47SyaBAZFpfyQSK4kEYqO2UnjuTDoV8OnCBZNwy0jvADemI',
  useServerTime: true, // If you get timestamp errors, synchronize to server time at startup
  test: false, // If you want to use sandbox mode where orders are simulated
  verbose: false, // Add extra output when subscribing to websockets, etc
  log: log => {
    console.log(log); // You can create your own logger here, or disable console output
   // log.info(log);
  }
});
*/

const log = require('simple-node-logger').createSimpleLogger('hope.log');
log.info("start");



var USD = 100;
var out = true;
var btc = 0;
var buy = 0;
var sell = 0;
var feeBTC = 0;
var sumfeeBTC = 0;
var feeUSD = 0;
var sumfeeUSD = 0;
var currentSellOrderId = false;
var currentBuyOrderId = false;
var buyState = 'no';
var buying = false;
var selling = false;
var curPrice;
var currentBuyPrice, currentSellPrice;
var priceSpan = 1.01;
var tradeSize = 11;

function placeBuyOrder(price){
    if(!buying){
    buying = true;
    currentBuyPrice = price;
    binance.balance((error, balances) => {
        if ( error ) return console.error(error);
        USD = balances.USDT.available;
        if(USD>tradeSize){
        var quantity = tradeSize/price;
        quantity = Math.floor(quantity*1000000)/1000000;
        
        price = Math.floor(currentBuyPrice*100)/100;

        console.log(quantity + "  "+ price);
        binance.buy("BTCUSDT", quantity, price, {type:'LIMIT'}, (error, response) => {
            console.log("Limit Buy response", response);
            log.info("Limit Buy response", response);
            console.log("order id: " + response.orderId);
            //console.log(error);
            currentBuyOrderId = response.orderId;
            buying = false;
          });
        }
      });
    }
}

function placeSellOrder(price){
    if(!selling){
    selling = true;
    currentSellPrice = price;
    binance.balance((error, balances) => {
        if ( error ) return console.error(error);
        btc = balances.BTC.available;
        if(btc*currentSellPrice>tradeSize){

        
        quantity = Math.floor((tradeSize/currentSellPrice)*1000000)/1000000;
        
        price = Math.floor(currentSellPrice*100)/100;

        binance.sell("BTCUSDT", quantity, price, {type:'LIMIT'}, (error, response) => {
            console.log("Limit Sell response", response);
            console.log("order id: " + response.orderId);
    
            log.info("Limit Sell response", response);
            //console.log(error);
            currentSellOrderId = response.orderId;
            selling = false;
          });
        }
      });
    }
}

function updateBuyOrder(price){
    currentBuyPrice = price;
    if(!buying){
        binance.cancel("BTCUSDT", currentBuyOrderId, (error, response, symbol) => {
        console.log(symbol+" cancel response:", response);
        log.info(symbol+" cancel response:", response);
        placeBuyOrder(currentBuyPrice);
        });
    }
}

function updateSellOrder(price){
    currentSellPrice = price;
    if(!selling){
     
        binance.cancel("BTCUSDT", currentSellOrderId, (error, response, symbol) => {
        console.log(symbol+" cancel response:", response);
        log.info(symbol+" cancel response:", response)
        placeSellOrder(currentSellPrice);
        });
    }
}

binance.websockets.trades(['BTCUSDT'], (trades) => {
  let {e:eventType, E:eventTime, s:symbol, p:price, q:quantity, m:maker, a:tradeId} = trades;
  
          price = parseFloat(price);
          curPrice = price;
          if(buy==0){
            buy = price/priceSpan;
            sell = price*priceSpan;

            binance.cancelOrders("BTCUSDT", (error, response, symbol) => {
                console.log(symbol+" cancel response:", response);
                console.log(error);
                placeBuyOrder(buy);
                placeSellOrder(sell);
              });
              
          }else{
              
                if(price>(buy*priceSpan)){
                    buy = price/priceSpan;
                   updateBuyOrder(buy);
                }
               // console.log("Buy: "+buy+ "  price: "+price);
            
                if(price<(sell/priceSpan)){
                     sell = price*priceSpan;
                     updateSellOrder(sell);
                }
                 // console.log("  price: "+price +"   sell: "+sell);
              }
          }
        
);

// The only time the user data (account balances) and order execution websockets will fire, is if you create or cancel an order, or an order gets filled or partially filled
function balance_update(data) {
	//console.log("Balance Update");
	for ( let obj of data.B ) {
        let { a:asset, f:available, l:onOrder } = obj;
        /*
		if ( available == "0.00000000" ) continue;
        console.log(asset+"\tavailable: "+available+" ("+onOrder+" on order)");
        */
       if (asset == 'USDT') {
           /*
           if((available>100)&&!out){
               //out = true;
               //buy = curPrice/priceSpan;
               //placeBuyOrder(buy);
               binance.orderStatus("BTCUSDT", currentOrderId, (error, orderStatus, symbol) => {
               console.log(symbol+" order status:", orderStatus);
                if(orderStatus.status=='FILLED'){
                    out = true;
                    log.info('OUT:');
                    buy = curPrice/priceSpan;
                    placeBuyOrder(buy);
                }
            });
            */
           if(available>tradeSize){
            binance.orderStatus("BTCUSDT", currentSellOrderId, (error, orderStatus, symbol) => {
                console.log(symbol+" order status:", orderStatus);
                 if(orderStatus.status=='FILLED'){
                     //out = true;
                    // placeSellOrder()
                    buy = 0;
                 }
           });
           }
       }

       if (asset == 'BTC') {
           /*
            if((available>0.01)&&out){
                //out = false;
                //sell = curPrice*priceSpan;
                
                binance.orderStatus("BTCUSDT", currentOrderId, (error, orderStatus, symbol) => {
                    console.log(symbol+" order status:", orderStatus);
                    if(orderStatus.status=='FILLED'){
                        out = false;
                        log.info('IN:');
                        sell = curPrice*priceSpan;
                        placeSellOrder(sell);
                    }
                });
               // placeSellOrder(sell);
                //log.info("IN: "+btc+ " Price: "+price + " fees: "+sumfeeUSD);
            }
            */
           if(available*curPrice>tradeSize){
            binance.orderStatus("BTCUSDT", currentBuyOrderId, (error, orderStatus, symbol) => {
                console.log(symbol+" order status:", orderStatus);
                if(orderStatus.status=='FILLED'){
                    
                    log.info('IN:');
                    buy = 0;
                }
            });
           }
       }
	}
}
function execution_update(data) {
	let { x:executionType, s:symbol, p:price, q:quantity, S:side, o:orderType, i:orderId, X:orderStatus } = data;
	if ( executionType == "NEW" ) {
		if ( orderStatus == "REJECTED" ) {
			console.log("Order Failed! Reason: "+data.r);
		}
		console.log(symbol+" "+side+" "+orderType+" ORDER #"+orderId+" ("+orderStatus+")");
		console.log("..price: "+price+", quantity: "+quantity);
		return;
	}
	//NEW, CANCELED, REPLACED, REJECTED, TRADE, EXPIRED
	console.log(symbol+"\t"+side+" "+executionType+" "+orderType+" ORDER #"+orderId);
}
binance.websockets.userData(balance_update, execution_update);