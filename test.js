const SerialPort = require("serialport");
const DelimiterParser = require('@serialport/parser-delimiter');

const Gpio = require("onoff").Gpio;

const soilPwr = new Gpio(17, 'out');        //output pin to control power to soil sensor


var mssg = "Decagon Soil Moisture Test";
console.log(mssg + '\r\n');

const port = new SerialPort('/dev/serial0',{
    baudRate: 1200
});

const parser = port.pipe(new DelimiterParser ({
    delimiter: '\r'
}));

port.on("error", function (err) {
    console.log("Open Error: " + err.message)
});

/*
port.write("Hello Serial Port World!!!\r\n", function(err){
    if(err) {
        return console.log("Write error: " + err.message);
    }
    console.log("Message Written!!");
});
*/


parser.on("data", function (data){
    //strip junk characters from start of string
    var raw = data.toString();
    var result = raw;
    var raw = raw.slice(result.search(/[a-zA-Z0-9]/))
    console.log("Data Rx: " + raw );
}).on("error", function (error){
     console.log("Error: " + error)
});

//cycle power to the sensor to generate the startup string
let cycles = 10;

let state = 1;  //start with power off
const intId = setInterval(() => {

        state === 1 ? state = 0 : state = 1;
        if(cycles)
            --cycles;
        else
        {
            console.log("Shutting sensor power off");
            soilPwr.writeSync(0);
            clearInterval(intId);
            port.close(error => {});
            console.log("Stopping Decagon test");
            state = 3;
        }

        switch(state) {

            case 0:
                //turn on power to the sensor
                soilPwr.writeSync(1);

                break;

            case 1:
                //turn power to sensor off
                soilPwr.writeSync(0);
                break;

            default:
        }
    }, 1000);
