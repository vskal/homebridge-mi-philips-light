require('./Base');

const inherits = require('util').inherits;
const miio = require('miio');

var Accessory, PlatformAccessory, Service, Characteristic, UUIDGen;
CeilingLamp = function(platform, config) {
    this.init(platform, config);
    
    Accessory = platform.Accessory;
    PlatformAccessory = platform.PlatformAccessory;
    Service = platform.Service;
    Characteristic = platform.Characteristic;
    UUIDGen = platform.UUIDGen;
    
    this.device = new miio.Device({
        address: this.config['ip'],
        token: this.config['token']
    });
    
    this.accessories = {};
    if(this.config['lightName'] && this.config['lightName'] != "") {
        this.accessories['LightAccessory'] = new CeilingLampCeilingLamp(this);
    }
    var accessoriesArr = this.obj2array(this.accessories);
    
    this.platform.log.debug("[MiPhilipsLightPlatform][DEBUG]Initializing " + this.config["type"] + " device: " + this.config["ip"] + ", accessories size: " + accessoriesArr.length);
    
    
    return accessoriesArr;
}
inherits(CeilingLamp, Base);

CeilingLampCeilingLamp = function(dThis) {
    this.device = dThis.device;
    this.name = dThis.config['lightName'];
    this.token = dThis.config['token'];
    this.platform = dThis.platform;
    this.updatetimere = dThis.config["updatetimer"];
    this.interval = dThis.config["interval"];
    if(this.interval == null){
        this.interval = 3;
    }
    this.Lampservice = false;
    this.timer;
    if(this.updatetimere === true){
        this.updateTimer();
    }
}

CeilingLampCeilingLamp.prototype.getServices = function() {
    var that = this;
    var services = [];
    var tokensan = this.token.substring(this.token.length-8);
    var infoService = new Service.AccessoryInformation();
    infoService
        .setCharacteristic(Characteristic.Manufacturer, "Philips")
        .setCharacteristic(Characteristic.Model, "Philips Ceiling Lamp")
        .setCharacteristic(Characteristic.SerialNumber, tokensan);
    services.push(infoService);
    
    var CeilingLampService = this.Lampservice = new Service.Lightbulb(this.name, "CeilingLamp");
    var CeilingLampOnCharacteristic = CeilingLampService.getCharacteristic(Characteristic.On);
    
    CeilingLampOnCharacteristic
        .on('get', function(callback) {
            this.device.call("get_prop", ["power"]).then(result => {
                that.platform.log.debug("[MiPhilipsLightPlatform][DEBUG]CeilingLamp - getPower: " + result);
                callback(null, result[0] === 'on' ? true : false);
            }).catch(function(err) {
                that.platform.log.error("[MiPhilipsLightPlatform][ERROR]CeilingLamp - getPower Error: " + err);
                callback(err);
            });
        }.bind(this))
        .on('set', function(value, callback) {
            that.device.call("set_power", [value ? "on" : "off"]).then(result => {
                that.platform.log.debug("[MiPhilipsLightPlatform][DEBUG]CeilingLamp - setPower Result: " + result);
                if(result[0] === "ok") {
                    callback(null);
                } else {
                    callback(new Error(result[0]));
                }
            }).catch(function(err) {
                that.platform.log.error("[MiPhilipsLightPlatform][ERROR]CeilingLamp - setPower Error: " + err);
                callback(err);
            });
        }.bind(this));
    CeilingLampService
        .addCharacteristic(Characteristic.Brightness)
        .on('get', function(callback) {
            this.device.call("get_prop", ["bright"]).then(result => {
                that.platform.log.debug("[MiPhilipsLightPlatform][DEBUG]CeilingLamp - getBrightness: " + result);
                callback(null, result[0]);
            }).catch(function(err) {
                that.platform.log.error("[MiPhilipsLightPlatform][ERROR]CeilingLamp - getBrightness Error: " + err);
                callback(err);
            });
        }.bind(this))
        .on('set', function(value, callback) {
            if(value > 0) {
                this.device.call("set_bright", [value]).then(result => {
                    that.platform.log.debug("[MiPhilipsLightPlatform][DEBUG]CeilingLamp - setBrightness Result: " + result);
                    if(result[0] === "ok") {
                        callback(null);
                    } else {
                        callback(new Error(result[0]));
                    }
                }).catch(function(err) {
                    that.platform.log.error("[MiPhilipsLightPlatform][ERROR]CeilingLamp - setBrightness Error: " + err);
                    callback(err);
                });
            } else {
                callback(null);
            }
        }.bind(this));
    CeilingLampService
        .addCharacteristic(Characteristic.Saturation)
        .on('get', function(callback) {
            this.device.call("get_prop", ["cct"]).then(result => {
                that.platform.log.debug("[MiPhilipsLightPlatform][DEBUG]CeilingLamp - getSaturation: " + result);
                callback(null, result[0]);
            }).catch(function(err) {
                that.platform.log.error("[MiPhilipsLightPlatform][ERROR]CeilingLamp - getSaturation Error: " + err);
                callback(err);
            });
        }.bind(this))
        .on('set', function(value,callback) {
            if(value > 0) {
                this.device.call("set_cct", [value]).then(result => {
                    that.platform.log.debug("[MiPhilipsLightPlatform][DEBUG]CeilingLamp - setSaturation Result: " + result);
                    if(result[0] === "ok") {
                        callback(null);
                    } else {
                        callback(new Error(result[0]));
                    }
                }).catch(function(err) {
                    that.platform.log.error("[MiPhilipsLightPlatform][ERROR]CeilingLamp - setSaturation Error: " + err);
                    callback(err);
                });
             } else {
                callback(null);
            }
        }.bind(this));
    services.push(CeilingLampService);
    return services;
}

CeilingLampCeilingLamp.prototype.updateTimer = function() {
    if (this.updatetimere) {
        clearTimeout(this.timer);
        this.timer = setTimeout(function() {
            if(this.Lampservice !== false){
                this.runTimer();
            }
            this.updateTimer();
        }.bind(this), this.interval * 1000);
    }
}

CeilingLampCeilingLamp.prototype.runTimer = function() {
    var that = this;
    this.device.call("get_prop", ["power"]).then(result => {
        that.platform.log.debug("[MiPhilipsLightPlatform][" + this.name + "][DEBUG]CeilingLamp - getPower: " + result);
        this.Lampservice.getCharacteristic(Characteristic.On).updateValue(result[0] === 'on' ? true : false);
    }).catch(function(err) {
        if(err == "Error: Call to device timed out"){
            that.platform.log.debug("[MiPhilipsLightPlatform][ERROR]CeilingLamp - Lamp Offline");
        }else{
            that.platform.log.error("[MiPhilipsLightPlatform][" + this.name + "][ERROR]CeilingLamp - getPower Error: " + err);
        }
    });
    this.device.call("get_prop", ["bright"]).then(result => {
        that.platform.log.debug("[MiPhilipsLightPlatform][" + this.name + "][DEBUG]CeilingLamp - getBrightness: " + result);
        this.Lampservice.getCharacteristic(Characteristic.Brightness).updateValue(result[0]);
    }).catch(function(err) {
        if(err == "Error: Call to device timed out"){
            that.platform.log.debug("[MiPhilipsLightPlatform][ERROR]CeilingLamp - Lamp Offline");
        }else{
            that.platform.log.error("[MiPhilipsLightPlatform][" + this.name + "][ERROR]CeilingLamp - getBrightness Error: " + err);
        }
    });
    this.device.call("get_prop", ["cct"]).then(result => {
        that.platform.log.debug("[MiPhilipsLightPlatform][" + this.name + "][DEBUG]CeilingLamp - getSaturation: " + result);
        this.Lampservice.getCharacteristic(Characteristic.Saturation).updateValue(result[0]);
    }).catch(function(err) {
        if(err == "Error: Call to device timed out"){
            that.platform.log.debug("[MiPhilipsLightPlatform][ERROR]CeilingLamp - Lamp Offline");
        }else{
            that.platform.log.error("[MiPhilipsLightPlatform][" + this.name + "][ERROR]CeilingLamp - getSaturation Error: " + err);
        }
    });
}