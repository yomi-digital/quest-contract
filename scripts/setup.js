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
    // Setting up 5 different games, all the same to test
    for (let i = 0; i <= 0; i++) {
        const game = i
        const quest = ["ELLIOT", "ALDERSON"]
        const leaves = await quest.map((x) => keccak256(x));
        const game_instructions = 'ipfs://bafkreibc24qtzyrntqpnyot3u7l2ivu2akacl26vfv2o6y2c2p735zyav4'
        const tree = await new MerkleTree(leaves, keccak256, {
            sortPairs: true,
        });
        const root = tree.getRoot().toString("hex");
        const price = ethers.utils.parseEther((i * 1).toString())
        const result = await contract.setupGame(game, "0x" + root, quest.length, game_instructions, price);
        console.log(result)
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
