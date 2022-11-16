import { ethers } from "ethers";
import MFRC522 from "mfrc522-rpi";
import SoftSPI from "rpi-softspi";

console.log(SoftSPI);

console.log("Scanning...");
console.log("Please put chip or keycard in the antenna inductive zone!");


//SPI Configuration
const softSPI = new SoftSPI({
	clock: 23, //pin number of SCLK
	mosi: 19, //pin number of MOSI
	miso: 21, //pin number of MISO
	client: 24 //pin number of CS
});

//mfrc522 Handler 
const mfrc522 = new MFRC522(softSPI).setResetPin(22).setBuzzerPin(18);

//main loop
setInterval(function() {
	//reset card
	mfrc522.reset();

	//scan for cards
	let response = mfrc522.findCard();

	//No card
	if (!response.status) {
		console.log("No Card");
		return;
	}

	console.log("Card detected, CardType: " + response.bitSize);

	//get UID of the card
	response = mfrc522.getUid();
	if (!response.status) {
		console.log("UID Scan Error");
		return;
	}

	const uid = response.data;
	console.log(
		"Card read UID: 0x " + uid[0].toString(16) + " " + uid[1].toString(16) + " "  + uid[2].toString(16) + " " + uid[0].toString(16)
 	);

	//Scaned Card Selection
	const memoryCapacity = mfrc522.selectCard(uid);
	console.log("Card Memory Capacity:" + memoryCapacity);

	//Default key for authentication
  	const key = [0xff, 0xff, 0xff, 0xff, 0xff, 0xff];

	let addressPart1 = [];
	let addressPart2 = [];

	//# Authenticate on Block 8 with key and uid
  	if (!mfrc522.authenticate(8, key, uid)) {
    		console.log("Authentication Error");
    		return;
  	}

	//# Dump Block 8
	addressPart1 = mfrc522.getDataForBlock(8);

    //# Authenticate on Block 9 with key and uid
  	if (!mfrc522.authenticate(8, key, uid)) {
        console.log("Authentication Error");
        return;
    }

    //# Dump Block 9
	addressPart2 = mfrc522.getDataForBlock(8);

	 //# Stop
 	 mfrc522.stopCrypto();

	console.log(addressPart1);
	console.log(addressPart2);
	
	//console.log(ethers.utils.toUtf8String(addressPart1))
  
	let array = [72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100];

	let stringFromArray = ethers.utils.toUtf8String(array)

	console.log(stringFromArray);
}, 500);