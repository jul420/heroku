const binance = require('node-binance-api');
const log = require('simple-node-logger').createSimpleLogger('hope.log');
log.info("start");


binance.options({
  APIKEY: '9oOV1Ptu7x532yjpxPEhEQ27Hs4puv0Grom5hc9NBiqdwtl8AKtYBijGY5HfOA86',
  APISECRET: 'c7u9JqYYmQIqww4yto59E6l0wEoE4XYLZqMhpfRq0E0qnGBSEH7GnMQeHiwt8Y7W',
  useServerTime: true, // If you get timestamp errors, synchronize to server time at startup
  test: true, // If you want to use sandbox mode where orders are simulated
  verbose: false, // Add extra output when subscribing to websockets, etc
  log: log => {
    console.log(log); // You can create your own logger here, or disable console output
    log.info(log);
  }
});



var USD = 100;
var out = true;
var btc = 0;
var buy = 0;
var sell = 0;
var feeBTC = 0;
var sumfeeBTC = 0;
var feeUSD = 0;
var sumfeeUSD = 0;

binance.websockets.trades(['BTCUSDT'], (trades) => {
  let {e:eventType, E:eventTime, s:symbol, p:price, q:quantity, m:maker, a:tradeId} = trades;
  
          price = parseFloat(price);
          if(buy==0){
              buy = price/1.006;
              sell = price*1.006;
          }else{
              if(out){
                if(price>(buy*1.006)){
                    buy = price/1.006;
                }
               // console.log("Buy: "+buy+ "  price: "+price);
              }else{
                  if(price<(sell/1.006)){
                     sell = price*1.006;
                  }
                 // console.log("  price: "+price +"   sell: "+sell);
              }
          }


          if(price<buy){
            if(out){
                out=false;
                btc = USD/price;
                
                USD = 0;
                sell = price*1.006;
                log.info("IN: "+btc+ " Price: "+price + " fees: "+sumfeeUSD);
                }
          }
          if(price>sell){
            if(!out){
                out=true;
                USD = btc*price;
                feeUSD = USD*0.0015;
                USD = USD - feeUSD;
                sumfeeUSD+=feeUSD;
                btc = 0;
                buy = price/1.006;
                log.info("OUT: "+USD+ " Price: "+price  + " fees: "+sumfeeUSD + " result: " + (USD + sumfeeUSD*0.8));
                }
          }
          
        
  }
);