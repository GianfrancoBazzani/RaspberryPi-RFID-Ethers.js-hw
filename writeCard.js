import {ethers} from "ethers";
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

	//# Address for card 0x8791Ad03B14D8341E6f3996822CDE7ea8C045881
	//let addressToWrite = "0x8791Ad03B14D8341E6f3996822CDE7ea8C045881000000000000000000000000" //card Address
	
	//# Address for tag 0xdF4395c8e950c07499920EF8900bE96ff3215A6C
	let addressToWrite = "0xdF4395c8e950c07499920EF8900bE96ff3215A6C000000000000000000000000" //tag Address


	let addressToWriteArray = ethers.utils.arrayify(addressToWrite)
	
	console.log(addressToWriteArray)
	
	let addressPart1 = addressToWriteArray.slice(0,16);
	let addressPart2 = addressToWriteArray.slice(16);


	//# Authenticate on Block 8 with key and uid
  	if (!mfrc522.authenticate(8, key, uid)) {
    		console.log("Authentication Error");
    		return;
  	}
	//# Write first 16 Bytes of the address
	mfrc522.writeDataToBlock(8, addressPart1);


	//# Authenticate on Block 9 with key and uid
  	if (!mfrc522.authenticate(9, key, uid)) {
    		console.log("Authentication Error");
    		return;
  	}
	//# Write last 4 Bytes + 16 dummy 0x00 of the address
	mfrc522.writeDataToBlock(9, addressPart2);

	//# Address recovery
	let recoveredAddressPart1 = mfrc522.getDataForBlock(8);
	let recoveredAddressPart2 = mfrc522.getDataForBlock(9);

	console.log(ethers.utils.hexlify(recoveredAddressPart1.concat(recoveredAddressPart2.slice(0,4))));


	//# Stop
 	mfrc522.stopCrypto();
}, 1000);
