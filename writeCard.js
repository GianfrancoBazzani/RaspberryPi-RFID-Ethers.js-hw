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

//Bytes array to Hex string conversion
const toHexString = (bytes) => {
  return bytes.map(function(byte) {
    if(byte > 9){
      return (byte & 0xFF).toString(16);
    } else {
      return "0" + (byte & 0xFF).toString(16);
    }
  }).join('')
}


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

	//# Address for card 0x8791Ad03B14D8341E6f3996822CDE7ea 8C045881
	let addressToWrite = "0x8791Ad03B14D8341E6f3996822CDE7ea8C045881" //card Address

	let addressToWriteArray = ethers.utils.arrayify(addressToWrite)
	
	console.log(addressToWriteArray)
	
	let addressPart1 = addressToWriteArray.slice(0,16);
	let addressPart2 = addressToWriteArray.slice(16).concat([0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00]);

	//let addressPart1 = [0x87,0x91,0xAd,0x03,0xB1,0x4D,0x83,0x41,0xE6,0xf3,0x99,0x68,0x22,0xCD,0xE7,0xea];
	//let addressPart2 = [0x8C,0x04,0x58,0x81,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00];

	//# Address for tag  0x8ba1f109551bd432803012645ac136ddd64dba72
	//let addressPart1 = [0x8b,0xa1,0xf1,0x09,0x55,0x1b,0xd4,0x32,0x80,0x30,0x12,0x64,0x5a,0xc1,0x36,0xdd];
	//let addressPart2 = [0xd6,0x4d,0xba,0x72,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00];

	//# Authenticate on Block 8 with key and uid
  	if (!mfrc522.authenticate(8, key, uid)) {
    		console.log("Authentication Error");
    		return;
  	}
	//# Write first 16 Bytes of the address
	console.log("Block 8 will be filled with addressPart1(16Bytes):");
	mfrc522.writeDataToBlock(8, addressPart1);


	//# Authenticate on Block 9 with key and uid
  	if (!mfrc522.authenticate(9, key, uid)) {
    		console.log("Authentication Error");
    		return;
  	}
	//# Write last 4 Bytes + 16 dummy 0x00 of the address
	console.log("Block 9 will be filled with addressPart2(4Bytes) + 16 0x00 dummy bytes:");
	mfrc522.writeDataToBlock(9, addressPart2);

	//# Address recovery
	let recoveredAddressPart1 = mfrc522.getDataForBlock(8);
	let recoveredAddressPart2 = mfrc522.getDataForBlock(9);

	console.log("0x" + toHexString(recoveredAddressPart1) + toHexString(recoveredAddressPart2).slice(0,8))


	//# Stop
 	mfrc522.stopCrypto();
}, 1000);
