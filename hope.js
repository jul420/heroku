

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

var btc,USD;
var buy = 0;
var sell = 0;
var feeBTC = 0;
var sumfeeBTC = 0;
var feeUSD = 0;
var sumfeeUSD = 0;
var currentSellOrderId = false;
var currentBuyOrderId = false;

var buying = false;
var selling = false;

var curPrice;
var currentBuyPrice, currentSellPrice;

var priceSpan = 1.016;
var tradeSize = 11;

function placeBuyOrder(price){
    currentBuyPrice = price;
    if(!buying){
    buying = true;
    log.info("try to buy");
    binance.balance((error, balances) => {
        log.info(error);
        USD = balances.USDT.available;
        if(USD>tradeSize){
        var quantity = tradeSize/price;
        quantity = Math.floor(quantity*1000000)/1000000;
        
        price = Math.floor(currentBuyPrice*100)/100;

      //  console.log(quantity + "  "+ price);
        binance.buy("BTCUSDT", quantity, price, {type:'LIMIT'}, (error, response) => {
        //    console.log("Limit Buy response", response);
            log.info(error);
            log.info("Limit Buy response", response);
        //    console.log("order id: " + response.orderId);
            //console.log(error);
            currentBuyOrderId = response.orderId;
            buying = false;
          });
        }else{
            log.info("not enough USD to buy");
            buying = false;
        }
      });
    }
}

function placeSellOrder(price){
    currentSellPrice = price;
    if(!selling){
    selling = true;
    log.info("try to sell");
    binance.balance((error, balances) => {
        log.info(error);
        btc = balances.BTC.available;
        if(btc*currentSellPrice>tradeSize){

        
        quantity = Math.floor((tradeSize/currentSellPrice)*1000000)/1000000;
        
        price = Math.floor(currentSellPrice*100)/100;

        binance.sell("BTCUSDT", quantity, price, {type:'LIMIT'}, (error, response) => {
          //  console.log("Limit Sell response", response);
          //  console.log("order id: " + response.orderId);
            log.info(error);
            log.info("Limit Sell response", response);
            //console.log(error);
            currentSellOrderId = response.orderId;
            selling = false;
          });
        }else{
            log.info("not enough btc to sell");
            selling = false;
        }
      });
    }
}

function updateBuyOrder(price){
    currentBuyPrice = price;
    if(!buying&&currentBuyOrderId!=0){
        log.info("canceling BuyOrder");
        binance.cancel("BTCUSDT", currentBuyOrderId, (error, response, symbol) => {
        
     //   console.log(symbol+" cancel response:", response);
        log.info(symbol+" cancel response:", response);
        placeBuyOrder(currentBuyPrice);
        });
        currentBuyOrderId = 0;
    }
    else if(!buying){  
        placeBuyOrder(currentBuyPrice);
    }
}

function updateSellOrder(price){
    currentSellPrice = price;
    if(!selling&&currentSellOrderId!=0){
        log.info("canceling SellOrder");
        binance.cancel("BTCUSDT", currentSellOrderId, (error, response, symbol) => {
       // console.log(symbol+" cancel response:", response);
        log.info(symbol+" cancel response:", response)
        placeSellOrder(currentSellPrice);
        });
        currentSellOrderId = 0;
    }else if(!selling){
        placeSellOrder(currentSellPrice);
    }
}

binance.websockets.trades(['BTCUSDT'], (trades) => {
  let {e:eventType, E:eventTime, s:symbol, p:price, q:quantity, m:maker, a:tradeId} = trades;
  
          price = parseFloat(price);
          curPrice = price;
          if(buy==0){
        
            buy = (price/priceSpan)+1;
            sell = (price*priceSpan)-1;
            log.info("canceling all Orders");
            binance.cancelOrders("BTCUSDT", (error, response, symbol) => {
               // console.log(symbol+" cancel response:", response);
               // console.log(error);
               log.info(error);
                placeBuyOrder(buy);
                placeSellOrder(sell);
              });
              
          }else{
              
                if(price>(buy*priceSpan)){
                    buy = (price/priceSpan)+1;
                    updateBuyOrder(buy);
                }
               // console.log("Buy: "+buy+ "  price: "+price);
            
                if(price<(sell/priceSpan)){
                     sell = (price*priceSpan)-1;
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
       
       if (asset == 'USDT') {
           
           if(available>tradeSize){
               if(currentSellOrderId!=0){
            binance.orderStatus("BTCUSDT", currentSellOrderId, (error, orderStatus, symbol) => {
              //  console.log(symbol+" order status:", orderStatus);
                 if(orderStatus.status=='FILLED'){
                    buy = 0;
                    currentSellOrderId = 0;
                    currentBuyOrderId = 0;
                 }
           });
        }
           }
        }

       if (asset == 'BTC') {
           
           if(available*curPrice>tradeSize){
            if(currentBuyOrderId!=0){
                binance.orderStatus("BTCUSDT", currentBuyOrderId, (error, orderStatus, symbol) => {
                   // console.log(symbol+" order status:", orderStatus);
                    if(orderStatus.status=='FILLED'){
                    
                    buy = 0;
                    currentSellOrderId = 0;
                    currentBuyOrderId = 0;

                    }
                });
           }
        }
       }
	}
}
function execution_update(data) {
	let { x:executionType, s:symbol, p:price, q:quantity, S:side, o:orderType, i:orderId, X:orderStatus } = data;
	if ( executionType == "NEW" ) {
		if ( orderStatus == "REJECTED" ) {
	//		console.log("Order Failed! Reason: "+data.r);
		}
	//	console.log(symbol+" "+side+" "+orderType+" ORDER #"+orderId+" ("+orderStatus+")");
	//	console.log("..price: "+price+", quantity: "+quantity);
		return;
	}
	//NEW, CANCELED, REPLACED, REJECTED, TRADE, EXPIRED
	//console.log(symbol+"\t"+side+" "+executionType+" "+orderType+" ORDER #"+orderId);
}
binance.websockets.userData(balance_update, execution_update);