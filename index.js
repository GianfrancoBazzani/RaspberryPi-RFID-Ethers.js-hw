import * as fs from 'fs';
import { ethers } from "ethers";
import MFRC522 from "mfrc522-rpi";
import SoftSPI from "rpi-softspi";


async function main(){
	//#Ethers.js setup
	const ControlAccessArtifact = JSON.parse(fs.readFileSync('./artifacts/contracts/ControlAccess.sol/ControlAccess.json', 'utf-8'));

	//import ControlAccessArtifact from "./artifacts/contracts/ControlAccess.sol/ControlAccess.json" assert {type: 'json'};

	const providerRPC = {
  		goerli: {
    			name: 'goerli',
    			rpc: "https://eth-goerli.g.alchemy.com/v2/NLb92VZ1dlIIDe-CJYgImlKQ5hovum1Y", 
    			chainId: 5,
  			},
		};

	const provider = new ethers.providers.StaticJsonRpcProvider(
  	providerRPC.goerli.rpc,
  	{
    		chainId: providerRPC.goerli.chainId,
    		name: providerRPC.goerli.name,
  	});


	//HW signer wallet
	const signer = new ethers.Wallet("180bfdfa5044a3c2cc1f991dc66f9929d3a434a4cdd5723999b0593a4877e740", provider);

	let balance = await signer.getBalance();
	let address = await signer.getAddress();

	console.log("HW address :" + address);
	console.log("HW balance :" +  ethers.utils.formatEther(balance));

	//Connecting signer to contract
	const ControlAccess = new ethers.Contract("0x6Ad1b8E61b31B1575427aDa77A7d3ee59BeaEfeA", ControlAccessArtifact.abi, signer);

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

	var mutex = false;

	//#RFID setup
	//SPI Configuration
	const softSPI = new SoftSPI({
		clock: 23, //pin number of SCLK
		mosi: 19, //pin number of MOSI
		miso: 21, //pin number of MISO
		client: 24 //pin number of CS
	});


	const mfrc522 = new MFRC522(softSPI).setResetPin(22);


	//# main loop
	setInterval(async function() {
		if(!mutex){
		//reset card
		mfrc522.reset();

		//scan for cards
		let response = mfrc522.findCard();

		//No card
		if (!response.status) {
			console.log("No Card");
			return;
		}

		console.log("Card detected");

		//get UID of the card
		response = mfrc522.getUid();
		if (!response.status) {
			console.log("UID Scan Error");
			return;
		}

		const uid = response.data;


		//Scaned Card Selection
		const memoryCapacity = mfrc522.selectCard(uid);

		//Default key for authentication
  		const key = [0xff, 0xff, 0xff, 0xff, 0xff, 0xff];

		//Authenticate on Block 8 with key and uid
                if (!mfrc522.authenticate(8, key, uid)) {
                        console.log("Authentication Error");
                        return;
                }

		//Authenticate on Block 9 with key and uid
  		if (!mfrc522.authenticate(9, key, uid)) {
    			console.log("Authentication Error");
    			return;
  		}

		//Dump Block 8
		let recoveredAddressPart1 = mfrc522.getDataForBlock(8);

		//Dump Block 9
		let recoveredAddressPart2 = mfrc522.getDataForBlock(9);

		//Stop card communication
		mfrc522.stopCrypto();
		//Address hexstring conversion
		let cardAddress = ("0x" + toHexString(recoveredAddressPart1) + toHexString(recoveredAddressPart2).slice(0,8));
		try{
			let formatedCardAddress = ethers.utils.getAddress(cardAddress);

			mutex = true;

		  	//Contract function call
		  	const tx = await ControlAccess.enter(cardAddress);
		  	await tx.wait();

			setTimeout(()=>{},5000);
			mutex = false;
		} catch(e){
			console.log(e);
		  	mutex = false;
		}
		}
	}, 750);
}

main()
