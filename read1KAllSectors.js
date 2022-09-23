import fs from "fs";
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
var fileAlreadyWrittenFlag = false;

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
		"Card read UID: %s %s %s %S",
		uid[0].toString(16),
		uid[1].toString(16),
		uid[2].toString(16),
		uid[3].toString(16)
	);

	//Scaned Card Selection
	const memoryCapacity = mfrc522.selectCard(uid);
	console.log("Card Memory Capacity:" + memoryCapacity);

	//Default key for authentication
  	const key = [0xff, 0xff, 0xff, 0xff, 0xff, 0xff];

	for(let i = 0; i < 64; i++){
		//# Authenticate on Block i with key and uid
  		if (!mfrc522.authenticate(i, key, uid)) {
    			console.log("Authentication Error");
    			return;
  		}

		//Read Sector:
		let msg = "Block: " + i + " Data: " + mfrc522.getDataForBlock(i) + "\n";

		console.log(msg);
		if (!fileAlreadyWrittenFlag) {
			fs.appendFile('./mem.txt', msg, err => {
  				if (err) {
    					console.error(err);
  				}
  			// file written successfully
			});
		}
		if( i == 63){
			fileAlreadyWrittenFlag = true;
			console.log("File Aleady Written");
		}
	}
	 //# Stop
 	 mfrc522.stopCrypto();

}, 500);


