const { ethers, utils } = require("ethers");
const fs = require('fs');
const { generate, derive } = require('../libs/address_generator')
const keccak256 = require("keccak256");
const { MerkleTree } = require("merkletreejs");

async function main() {
    const configs = JSON.parse(fs.readFileSync(process.env.CONFIG).toString())
    const ABI = JSON.parse(fs.readFileSync('./artifacts/contracts/' + configs.contract_name + '.sol/' + configs.contract_name + '.json').toString())
    const provider = new ethers.providers.JsonRpcProvider(configs.provider);
    let wallet = new ethers.Wallet.fromMnemonic(configs.owner_mnemonic, "m/44'/60'/0'/0/4").connect(provider)
    const contract = new ethers.Contract(configs.contract_address, ABI.abi, wallet)
    const price = await contract.round_price()
    console.log('Using address:', wallet.address)
    console.log('Trying to solve with price: ' + ethers.utils.formatEther(price) + ' ETH')

    const game = 1
    const quest = ["HELLO WORLD", "YOMI"]
    const solution = "HELLO WORLD"
    
    let leaves = await quest.map((x) => keccak256(x));
    let tree = await new MerkleTree(leaves, keccak256, {
        sortPairs: true,
    });
    const proof = tree.getHexProof(keccak256(solution));
    
    const lives_before = await contract.lives(wallet.address)
    console.log("LIVES BEFORE GAME ARE: " + lives_before.toString())
    console.log("TRYING WITH FOLLOWING PARAMETERS:", game, proof, solution)
    const result = await contract.solveGame(game, proof, solution, { value: price })
    console.log(result)

    const lives_after = await contract.lives(wallet.address)
    console.log("LIVES AFTER GAME ARE: " + lives_after.toString())
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
