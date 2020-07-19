const SerialPort = require("serialport");
const DelimiterParser = require('@serialport/parser-delimiter');

const Gpio = require("onoff").Gpio;

const soilPwr = new Gpio(17, 'out');        //output pin to control power to soil sensor


var mssg = "Decagon Soil Moisture Test";
console.log(mssg + '\r\n');

const port = new SerialPort('/dev/serial0',{
    baudRate: 1200
});

const parser = port.pipe(new DelimiterParser ({delimiter: '\n'}));

port.on("error", function (err) {
    console.log("Open Error: " + err.message)
});

var tempFn = function (senseT) {
    return (senseT - 400)/10;
};

var conductFn = function (senseC) {
    return 5 * (senseC - 700) + 700;
};

var vwcFn = function (senseV) {
    return 4.3e-6 * Math.pow(senseV, 3) - 5.5e-4 * Math.pow(senseV, 2) + 2.92e-2 * senseV - 5.3e-2;
}

var convert = function (dataArray) {

    var result = [];

    result[0] = vwcFn(dataArray[0]);
    result[1] = conductFn(dataArray[1]);
    result[2] = tempFn(dataArray[2]);

    return result;

};

parser.on("data", function (data){

    //strip junk characters from start of string
    var raw = data.toString();
    var result = raw;
    var raw = raw.slice(result.search(/[a-zA-Z0-9]/))
    console.log("Data Raw: " + raw );

    //create data array
    result = raw.split(' ');
    console.log("Split: " + result);
    var data = result.map((str) => parseInt(str, 10));
    console.log("Data: " + data);

    //convert raw data to sensor output
    var output = convert(data);
    console.log("Volumetric Water Content: " + output[0]);
    console.log("Conductivity: " + output[1]);
    console.log("Temperature: " + output[2]);

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
