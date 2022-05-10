const { ethers, utils } = require("ethers");
const fs = require('fs');
const keccak256 = require("keccak256");
const { MerkleTree } = require("merkletreejs");

async function main() {
    const configs = JSON.parse(fs.readFileSync(process.env.CONFIG).toString())
    const ABI = JSON.parse(fs.readFileSync('./artifacts/contracts/' + configs.contract_name + '.sol/' + configs.contract_name + '.json').toString())
    const provider = new ethers.providers.JsonRpcProvider(configs.provider);
    let wallet = new ethers.Wallet(configs.owner_key).connect(provider)
    const contract = new ethers.Contract(configs.contract_address, ABI.abi, wallet)
    const game = 1
    const quest = ["HELLO WORLD", "YOMI"]
    let leaves = await quest.map((x) => keccak256(x));
    let tree = await new MerkleTree(leaves, keccak256, {
        sortPairs: true,
    });
    let root = tree.getRoot().toString("hex");
    const result = await contract.setupGame("0x" + root, game, quest.length)
    console.log(result)
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
