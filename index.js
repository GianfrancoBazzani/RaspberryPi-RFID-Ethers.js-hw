import * as fs from 'fs';
import { ethers } from "ethers";
import MFRC522 from "mfrc522-rpi";
import SoftSPI from "rpi-softspi";


async function main(){
	//#Ethers.js setup 
	const AccessControlArtifact = JSON.parse(fs.readFileSync('./artifacts/contracts/AccessControl.sol/AccessControl.json', 'utf-8'));

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
	const signer = new ethers.Wallet("d83b2dc2199c7c2def7d781b842ca54e2b8d0f2852c77441fe742c2b0833dad3", provider);

	let balance = await signer.getBalance();
	let address = await signer.getAddress();

	console.log("HW address :" + address);
	console.log("HW balance :" +  ethers.utils.formatEther(balance));

	//Connecting signer to contract
	const AccessControl = new ethers.Contract("0x5B65D6Dc1C2A8909604CD0188822D06975E9218B", AccessControlArtifact.abi, signer);

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
		let cardAddress = ethers.utils.hexlify(recoveredAddressPart1.concat(recoveredAddressPart2.slice(0,4)));
		try{
			
			let formatedCardAddress = ethers.utils.getAddress(cardAddress);
			mutex = true;
			
			console.log(AccessControl)
			
		  	//Contract function call
		  	const tx = await AccessControl.register(cardAddress);
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
